import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useSubmitLead } from '@/hooks/use-submit-lead';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { useGarageAuth, GARAGE_PHONE_KEY, notifyGarageAuthChanged, notifyGarageOrdersChanged } from '@/hooks/use-garage-auth';
import { usePhotoAttach } from '@/hooks/use-photo-attach';
import { usePhoneCallVerification } from '@/hooks/use-phone-call-verification';
import { getStoredCity } from '@/lib/garage-city';
import { safeSetItem, safeRemoveItem } from '@/lib/storage';
import { setLastVin } from '@/hooks/use-last-vin';
import {
  RequestContext,
  isValidName,
  isValidPhone,
  GARAGE_LOOKUP_URL,
  STORAGE_KEY,
  emptyForm,
  loadDraft,
  GarageCar,
} from './request-dialog/RequestContext';
import RequestFormFields from './request-dialog/RequestFormFields';
import RequestPhoneVerificationStep from './request-dialog/RequestPhoneVerificationStep';

export { useRequest } from './request-dialog/RequestContext';

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { authed: garageAuthed, phone: garagePhone } = useGarageAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [messenger, setMessenger] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Два независимых набора фото — у поля VIN свои миниатюры, у поля «Интересующие запчасти»
  // свои; при отправке оба набора объединяются в один список фото заявки.
  const vinPhoto = usePhotoAttach();
  const partsPhoto = usePhotoAttach();
  const [knownContact, setKnownContact] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [garageCars, setGarageCars] = useState<GarageCar[]>([]);
  const [vinSource, setVinSource] = useState<'garage' | 'manual' | null>(null);
  const nameLookupTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLookupPhone = useRef<string>('');
  // Когда по введённому телефону нашлось имя клиента — прячем поле «Имя» плавным
  // исчезновением, храним пару телефон/имя, чтобы понять, что подстановка ещё актуальна
  const [autoFilledName, setAutoFilledName] = useState<{ phone: string; name: string } | null>(null);
  // Шаг подтверждения номера звонком: показывается только если у клиента ещё нет
  // подтверждённого номера (проверяем перед фактической отправкой заявки в базу)
  const [verificationStep, setVerificationStep] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);
  const verification = usePhoneCallVerification();

  // Клиент вошёл в «Гараж» — подгружаем список его автомобилей с названиями (привязаны к VIN)
  useEffect(() => {
    if (!garageAuthed || !garagePhone) {
      setGarageCars([]);
      return;
    }
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(garagePhone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const orders: { vin: string | null; car_name: string | null }[] = data.orders || [];
        const seen = new Set<string>();
        const cars: GarageCar[] = [];
        orders.forEach((o) => {
          if (o.vin && o.car_name && !seen.has(o.vin)) {
            seen.add(o.vin);
            cars.push({ vin: o.vin, car_name: o.car_name });
          }
        });
        setGarageCars(cars);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [garageAuthed, garagePhone]);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft.form);
      setMessenger(draft.messenger);
    }
  }, []);

  useEffect(() => {
    const hasData = form.vin || form.name || form.phone || form.parts || messenger;
    if (hasData) {
      safeSetItem(STORAGE_KEY, JSON.stringify({ form, messenger }));
    } else {
      safeRemoveItem(STORAGE_KEY);
    }
  }, [form, messenger]);

  // Запоминаем VIN сразу по мере ввода (не дожидаясь отправки формы) — чтобы плавающая
  // кнопка WhatsApp/Telegram могла подставить его в сообщение, даже если клиент откроет
  // чат раньше, чем отправит саму заявку
  useEffect(() => {
    if (form.vin) setLastVin(form.vin);
  }, [form.vin]);

  // Телефон привязан к одному имени: при вводе известного номера имя подставляется автоматически.
  // Только для клиента, уже вошедшего в свой «Гараж» — иначе по чужому номеру телефона
  // можно было бы узнать имя другого человека, ранее оставившего заявку.
  useEffect(() => {
    if (knownContact || !garageAuthed) return;
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 10) return;
    if (lastLookupPhone.current === digits) return;

    clearTimeout(nameLookupTimer.current);
    nameLookupTimer.current = setTimeout(async () => {
      lastLookupPhone.current = digits;
      try {
        const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(digits)}`);
        if (!res.ok) return;
        const data = await res.json();
        const foundName = data.orders?.[0]?.name;
        if (foundName) {
          setForm((f) => (f.phone.replace(/\D/g, '') === digits ? { ...f, name: foundName } : f));
          setAutoFilledName({ phone: digits, name: foundName });
        }
      } catch {
        // тихо игнорируем — это необязательная подсказка
      }
    }, 500);

    return () => clearTimeout(nameLookupTimer.current);
  }, [form.phone, knownContact, garageAuthed]);

  // Как только телефон перестаёт совпадать с тем, по которому подставили имя — снова
  // показываем поле «Имя» (клиент мог изменить номер после автоподстановки)
  useEffect(() => {
    if (!autoFilledName) return;
    const digits = form.phone.replace(/\D/g, '');
    if (digits !== autoFilledName.phone) {
      setAutoFilledName(null);
    }
  }, [form.phone, autoFilledName]);

  const open = (vin?: string, incomingPhotos?: File[], phone?: string, name?: string, history?: string[], city?: string) => {
    setErrors({});
    setForm((f) => ({
      ...f,
      vin: vin ?? f.vin,
      phone: phone ?? f.phone,
      name: name ?? f.name,
      city: city ?? (f.city || getStoredCity()),
    }));
    setKnownContact(isValidName(name) && isValidPhone(phone));
    setAutoFilledName(null);
    lastLookupPhone.current = '';
    setVinHistory(history ?? []);
    setVinSource(vin ? 'manual' : null);
    if (incomingPhotos && incomingPhotos.length > 0) {
      vinPhoto.addPhotos(incomingPhotos);
    }
    setIsOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    const vinValid = vin.length === 10 || vin.length === 17;
    if (!vinValid) {
      if (vin.length === 0) {
        if (vinPhoto.photos.length === 0 && partsPhoto.photos.length === 0) {
          e.vin = 'Укажите VIN или прикрепите фото';
        }
      } else {
        e.vin = 'VIN должен содержать 10 или 17 символов';
      }
    }
    if (!knownContact && form.name.trim().length < 2) {
      e.name = 'Укажите имя';
    }
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!knownContact && phoneDigits.length < 10) {
      e.phone = 'Укажите корректный телефон';
    }
    if (!messenger) {
      e.messenger = 'Выберите мессенджер';
    }
    if (!form.city) {
      e.city = 'Выберите город';
    }
    if (form.parts.trim().length < 2) {
      e.parts = 'Укажите интересующие запчасти';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const { submitLead, submitting } = useSubmitLead(() => {
    setIsOpen(false);
    toast({
      title: 'Заявка отправлена',
      description: 'Спасибо! Свяжемся с Вами в ближайшее время.',
    });
    // После успешной заявки клиент сразу попадает в свой личный кабинет «Гараж»
    if (!garageAuthed && form.phone) {
      safeSetItem(GARAGE_PHONE_KEY, form.phone);
      notifyGarageAuthChanged();
    }
    if (location.pathname === '/garage') {
      // Уже в «Моём гараже» — тихо обновляем список в фоне
      notifyGarageOrdersChanged();
    } else {
      navigate('/garage');
    }
    setForm(emptyForm);
    setMessenger(null);
    setKnownContact(false);
    setAutoFilledName(null);
    setVinSource(null);
    vinPhoto.resetPhotos();
    partsPhoto.resetPhotos();
    safeRemoveItem(STORAGE_KEY);
    setVerificationStep(false);
    verification.reset();
    setPendingSubmit(null);
  });

  const [checkingVerification, setCheckingVerification] = useState(false);

  const performSubmit = async () => {
    setLastVin(form.vin);
    const [vinPhotoUrls, partsPhotoUrls] = await Promise.all([
      vinPhoto.preparePhotosForUpload(),
      partsPhoto.preparePhotosForUpload(),
    ]);
    submitLead({
      vin: form.vin,
      name: form.name,
      phone: form.phone,
      parts: form.parts,
      city: form.city,
      messenger,
      photos: [...vinPhotoUrls, ...partsPhotoUrls],
      promoCode: form.promoCode,
    });
  };

  // Заявка реально отправляется в базу только после того, как номер телефона
  // подтверждён звонком. Уже авторизованный в «Гараже» клиент проходит эту
  // проверку один раз при входе, поэтому здесь его не переспрашиваем.
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const phoneDigits = form.phone.replace(/\D/g, '');
    if (!garageAuthed) {
      setCheckingVerification(true);
      const verified = await verification.checkPhoneVerified(phoneDigits);
      setCheckingVerification(false);
      if (!verified) {
        setPendingSubmit(() => performSubmit);
        setVerificationStep(true);
        return;
      }
    }
    await performSubmit();
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const phoneDigits = form.phone.replace(/\D/g, '');
    const ok = await verification.verifyCode(phoneDigits);
    if (ok) {
      setVerificationStep(false);
      verification.reset();
      pendingSubmit?.();
      setPendingSubmit(null);
    }
  };

  const handleRequestCall = () => {
    verification.requestCall(form.phone.replace(/\D/g, ''));
  };

  const handleBackFromVerification = () => {
    setVerificationStep(false);
    verification.reset();
    setPendingSubmit(null);
  };

  const formContent = (
    <RequestFormFields
      form={form}
      setForm={setForm}
      errors={errors}
      messenger={messenger}
      setMessenger={setMessenger}
      knownContact={knownContact}
      nameAutoFilled={!!autoFilledName}
      vinHistory={vinHistory}
      garageCars={garageCars}
      vinSource={vinSource}
      setVinSource={setVinSource}
      vinPhotos={vinPhoto.photos}
      vinPhotoPreviews={vinPhoto.photoPreviews}
      addVinPhotos={vinPhoto.addPhotos}
      removeVinPhoto={vinPhoto.removePhoto}
      partsPhotos={partsPhoto.photos}
      partsPhotoPreviews={partsPhoto.photoPreviews}
      addPartsPhotos={partsPhoto.addPhotos}
      removePartsPhoto={partsPhoto.removePhoto}
      submitting={submitting || checkingVerification}
      onSubmit={submit}
    />
  );

  const verificationContent = (
    <RequestPhoneVerificationStep
      phone={form.phone}
      callRequested={verification.callRequested}
      callLoading={verification.callLoading}
      codeInput={verification.codeInput}
      setCodeInput={verification.setCodeInput}
      error={verification.error}
      verifyLoading={verification.verifyLoading}
      cooldown={verification.callCooldown}
      requestCall={handleRequestCall}
      submitCode={handleVerifyCode}
      onBack={handleBackFromVerification}
    />
  );

  const dialogBody = verificationStep ? verificationContent : formContent;

  if (isMobile) {
    return (
      <RequestContext.Provider value={{ open }}>
        {children}
        <Drawer
          open={isOpen}
          onOpenChange={setIsOpen}
          repositionInputs={false}
          shouldScaleBackground={false}
        >
          <DrawerContent className="bg-card border-border max-h-[85vh]">
            <div className="overflow-y-auto px-4 pb-6">
              <DrawerHeader className="px-0 text-left">
                <DrawerTitle className="font-head uppercase tracking-wide text-2xl">
                  {verificationStep ? 'Подтверждение номера' : 'Заявка на подбор'}
                </DrawerTitle>
                <DrawerDescription className="text-muted-foreground">
                  {verificationStep
                    ? 'Осталось подтвердить номер телефона.'
                    : 'Оставьте VIN и контакты — найдём деталь и сообщим цену.'}
                </DrawerDescription>
              </DrawerHeader>
              {dialogBody}
            </div>
          </DrawerContent>
        </Drawer>
      </RequestContext.Provider>
    );
  }

  return (
    <RequestContext.Provider value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="font-head uppercase tracking-wide text-2xl">
              {verificationStep ? 'Подтверждение номера' : 'Заявка на подбор'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {verificationStep
                ? 'Осталось подтвердить номер телефона.'
                : 'Оставьте VIN и контакты — найдём деталь и сообщим цену.'}
            </DialogDescription>
          </DialogHeader>
          {dialogBody}
        </DialogContent>
      </Dialog>
    </RequestContext.Provider>
  );
};

export default RequestProvider;