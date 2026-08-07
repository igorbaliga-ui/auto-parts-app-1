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
import { useGarageAuth, GARAGE_PHONE_KEY, notifyGarageAuthChanged, notifyGarageOrdersChanged } from '@/hooks/use-garage-auth';
import { preparePhotoForUpload } from '@/lib/image';
import { getStoredCity } from '@/lib/garage-city';
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
import RequestSuccessMessage from './request-dialog/RequestSuccessMessage';
import RequestFormFields from './request-dialog/RequestFormFields';

export { useRequest } from './request-dialog/RequestContext';

export const RequestProvider = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { authed: garageAuthed, phone: garagePhone } = useGarageAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [messenger, setMessenger] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [knownContact, setKnownContact] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [garageCars, setGarageCars] = useState<GarageCar[]>([]);
  const [vinSource, setVinSource] = useState<'garage' | 'manual' | null>(null);
  const nameLookupTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLookupPhone = useRef<string>('');

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, messenger }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [form, messenger]);

  // Телефон привязан к одному имени: при вводе известного номера имя подставляется автоматически
  useEffect(() => {
    if (knownContact) return;
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
        }
      } catch {
        // тихо игнорируем — это необязательная подсказка
      }
    }, 500);

    return () => clearTimeout(nameLookupTimer.current);
  }, [form.phone, knownContact]);

  const open = (vin?: string, incomingPhoto?: File | null, phone?: string, name?: string, history?: string[], city?: string) => {
    setSent(false);
    setErrors({});
    setForm((f) => ({
      ...f,
      vin: vin ?? f.vin,
      phone: phone ?? f.phone,
      name: name ?? f.name,
      city: city ?? (f.city || getStoredCity()),
    }));
    setKnownContact(isValidName(name) && isValidPhone(phone));
    setVinHistory(history ?? []);
    setVinSource(vin ? 'manual' : null);
    if (incomingPhoto) {
      setPhoto(incomingPhoto);
      setPhotoPreview(URL.createObjectURL(incomingPhoto));
    }
    setIsOpen(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoPreview(null);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const vin = form.vin.trim();
    const vinValid = vin.length >= 11 && vin.length <= 17;
    if (!vinValid && !photo) {
      e.vin = 'Укажите VIN или прикрепите фото СТС';
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
    setSent(true);
    // Неавторизованный в «Гараже» клиент после успешной заявки сразу попадает в свой личный кабинет
    if (!garageAuthed && form.phone) {
      localStorage.setItem(GARAGE_PHONE_KEY, form.phone);
      notifyGarageAuthChanged();
      setIsOpen(false);
      navigate('/garage');
    } else if (location.pathname === '/garage') {
      // Уже в «Моём гараже» — тихо обновляем список в фоне, не закрывая окно
      // «Заявка отправлена» и не перезагружая страницу
      notifyGarageOrdersChanged();
    }
    setForm(emptyForm);
    setMessenger(null);
    setKnownContact(false);
    setVinSource(null);
    removePhoto();
    localStorage.removeItem(STORAGE_KEY);
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    const photoBase64 = photo ? await preparePhotoForUpload(photo) : null;
    submitLead({
      vin: form.vin,
      name: form.name,
      phone: form.phone,
      parts: form.parts,
      city: form.city,
      messenger,
      photo: photoBase64,
    });
  };

  const closeAfterSuccess = () => {
    setIsOpen(false);
  };

  const successContent = <RequestSuccessMessage onClose={closeAfterSuccess} />;

  const formContent = (
    <RequestFormFields
      form={form}
      setForm={setForm}
      errors={errors}
      messenger={messenger}
      setMessenger={setMessenger}
      knownContact={knownContact}
      vinHistory={vinHistory}
      garageCars={garageCars}
      vinSource={vinSource}
      setVinSource={setVinSource}
      photoPreview={photoPreview}
      handlePhotoSelect={handlePhotoSelect}
      removePhoto={removePhoto}
      submitting={submitting}
      onSubmit={submit}
    />
  );

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
              {sent ? (
                successContent
              ) : (
                <>
                  <DrawerHeader className="px-0 text-left">
                    <DrawerTitle className="font-head uppercase tracking-wide text-2xl">
                      Заявка на подбор
                    </DrawerTitle>
                    <DrawerDescription className="text-muted-foreground">
                      Оставьте VIN и контакты — найдём деталь и сообщим цену.
                    </DrawerDescription>
                  </DrawerHeader>
                  {formContent}
                </>
              )}
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
          {sent ? (
            successContent
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-head uppercase tracking-wide text-2xl">
                  Заявка на подбор
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Оставьте VIN и контакты — найдём деталь и сообщим цену.
                </DialogDescription>
              </DialogHeader>
              {formContent}
            </>
          )}
        </DialogContent>
      </Dialog>
    </RequestContext.Provider>
  );
};

export default RequestProvider;