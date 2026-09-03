import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubmitLead } from '@/hooks/use-submit-lead';
import { toast } from '@/hooks/use-toast';
import { GARAGE_PHONE_KEY, notifyGarageAuthChanged, notifyGarageOrdersChanged } from '@/hooks/use-garage-auth';
import { usePhoneCallVerification } from '@/hooks/use-phone-call-verification';
import { safeSetItem } from '@/lib/storage';
import { setLastVin } from '@/hooks/use-last-vin';
import { PromoStatus } from './useRequestFormState';

type FormState = { vin: string; name: string; phone: string; parts: string; city: string; promoCode: string };

type UseRequestSubmitParams = {
  form: FormState;
  messenger: string | null;
  knownContact: boolean;
  knownPhoneNoAuth: string | null;
  promoAlreadyUsed: boolean;
  checkPromoCode: () => Promise<PromoStatus>;
  garageAuthed: boolean;
  vinPhoto: { photos: File[]; preparePhotosForUpload: () => Promise<string[]> };
  partsPhoto: { photos: File[]; preparePhotosForUpload: () => Promise<string[]> };
  setIsOpen: (open: boolean) => void;
  resetForm: () => void;
};

/** Валидация, отправка заявки и шаг подтверждения телефона звонком. */
export const useRequestSubmit = ({
  form,
  messenger,
  knownContact,
  knownPhoneNoAuth,
  promoAlreadyUsed,
  checkPromoCode,
  garageAuthed,
  vinPhoto,
  partsPhoto,
  setIsOpen,
  resetForm,
}: UseRequestSubmitParams) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Форма разбита на 3 шага: 1 — VIN, 2 — телефон/имя/мессенджер/город,
  // 3 — запчасти/промокод. Шаг подтверждения номера звонком (verificationStep)
  // отдельный и показывается поверх шагов после нажатия «Отправить заявку» на шаге 3.
  const [step, setStep] = useState(1);
  // Направление последнего перехода между шагами — определяет, с какой стороны
  // заезжает контент следующего шага (вперёд — справа, назад — слева).
  const [stepDirection, setStepDirection] = useState<'forward' | 'backward'>('forward');
  const TOTAL_STEPS = 3;
  const [verificationStep, setVerificationStep] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const verification = usePhoneCallVerification();

  const validateStep = (targetStep: number, e: Record<string, string>) => {
    if (targetStep === 1) {
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
    }
    if (targetStep === 2) {
      if (!knownContact && !knownPhoneNoAuth && form.name.trim().length < 2) {
        e.name = 'Укажите имя';
      }
      const phoneDigits = form.phone.replace(/\D/g, '');
      if (!knownContact && phoneDigits.length < 11) {
        e.phone = 'Телефон указан не полностью';
      }
      if (!messenger) {
        e.messenger = 'Выберите мессенджер';
      }
      if (!form.city) {
        e.city = 'Выберите город';
      }
    }
    if (targetStep === 3) {
      if (form.parts.trim().length < 2) {
        e.parts = 'Укажите интересующие запчасти';
      }
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    validateStep(1, e);
    validateStep(2, e);
    validateStep(3, e);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    const e: Record<string, string> = {};
    validateStep(step, e);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStepDirection('forward');
      setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const goBack = () => {
    setErrors({});
    setStepDirection('backward');
    setStep((s) => Math.max(s - 1, 1));
  };

  const resetStep = () => {
    setStep(1);
    setStepDirection('forward');
  };

  const { submitLead, submitting } = useSubmitLead(() => {
    setIsOpen(false);
    // Стандартный таймаут автозакрытия toast в проекте намеренно очень большой
    // (см. src/hooks/use-toast.ts, файл защищён от правок), поэтому для этого
    // конкретного уведомления закрываем его вручную через 5 секунд — иначе оно
    // выглядит как зависшее и не пропадает само.
    const { dismiss } = toast({
      title: 'Заявка отправлена',
      description: 'Спасибо! Свяжемся с Вами в ближайшее время.',
    });
    setTimeout(dismiss, 5000);
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
    resetForm();
    setVerificationStep(false);
    verification.reset();
    setPendingSubmit(null);
    resetStep();
  });

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
    // Промокод сверяется с базой только здесь, в момент отправки — чтобы нельзя было
    // подобрать чужой код перебором через живую проверку по мере набора символов
    if (!knownContact && !promoAlreadyUsed && form.promoCode.trim()) {
      const promoResult = await checkPromoCode();
      if (promoResult === 'invalid') {
        setErrors((prev) => ({ ...prev, promoCode: 'Такого промокода не существует' }));
        return;
      }
    }
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

  return {
    errors,
    setErrors,
    submitting,
    checkingVerification,
    verificationStep,
    verification,
    submit,
    handleVerifyCode,
    handleRequestCall,
    handleBackFromVerification,
    step,
    stepDirection,
    totalSteps: TOTAL_STEPS,
    goNext,
    goBack,
    resetStep,
  };
};