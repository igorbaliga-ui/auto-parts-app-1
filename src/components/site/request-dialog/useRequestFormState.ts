import { useEffect, useRef, useState } from "react";
import { usePhotoAttach } from "@/hooks/use-photo-attach";
import { getStoredCity } from "@/lib/garage-city";
import { safeSetItem, safeRemoveItem } from "@/lib/storage";
import { setLastVin } from "@/hooks/use-last-vin";
import {
  isValidName,
  isValidPhone,
  GARAGE_LOOKUP_URL,
  STORAGE_KEY,
  emptyForm,
  loadDraft,
  GarageCar,
} from "./RequestContext";

export type PromoStatus = "idle" | "checking" | "valid" | "invalid";

type UseRequestFormStateParams = {
  garageAuthed: boolean;
  garagePhone: string | null;
};

/** Состояние полей формы заявки, черновик, автоподстановки и проверки промокода. */
export const useRequestFormState = ({
  garageAuthed,
  garagePhone,
}: UseRequestFormStateParams) => {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [messenger, setMessenger] = useState<string | null>(null);
  // Два независимых набора фото — у поля VIN свои миниатюры, у поля «Интересующие запчасти»
  // свои; при отправке оба набора объединяются в один список фото заявки.
  const vinPhoto = usePhotoAttach();
  const partsPhoto = usePhotoAttach();
  const [knownContact, setKnownContact] = useState(false);
  const [vinHistory, setVinHistory] = useState<string[]>([]);
  const [garageCars, setGarageCars] = useState<GarageCar[]>([]);
  const [vinSource, setVinSource] = useState<"garage" | "manual" | null>(null);
  const nameLookupTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastLookupPhone = useRef<string>("");
  // Промокод друга проверяется бэкендом только в момент отправки заявки (а не по мере
  // набора символов) — иначе живая проверка на каждый символ позволила бы перебором
  // подобрать чужой действующий код
  const [promoStatus, setPromoStatus] = useState<PromoStatus>("idle");
  const lastCheckedPromo = useRef<string>("");
  // Когда по введённому телефону нашлось имя клиента — прячем поле «Имя» плавным
  // исчезновением, храним пару телефон/имя, чтобы понять, что подстановка ещё актуальна
  const [autoFilledName, setAutoFilledName] = useState<{
    phone: string;
    name: string;
  } | null>(null);
  // Для неавторизованного посетителя имя не подставляем (нельзя узнавать чужие имена), но
  // если номер уже есть в базе — прячем само поле «Имя» целиком (оно возьмётся на бэкенде
  // из первой заявки клиента по этому номеру)
  const [knownPhoneNoAuth, setKnownPhoneNoAuth] = useState<string | null>(null);
  const existsCheckTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastExistsCheckPhone = useRef<string>("");
  // Промокод друга можно указать только один раз: если к введённому телефону уже
  // привязан чужой промокод — поле «Промокод друга» скрывается, как и поле «Имя»
  const [promoAlreadyUsed, setPromoAlreadyUsed] = useState(false);
  const promoUsedCheckTimer = useRef<ReturnType<typeof setTimeout>>();
  const lastPromoUsedCheckPhone = useRef<string>("");
  // Разовый бонус за регистрацию (задаётся менеджером в /admin) — подсказка в форме,
  // что за первую заявку начислится дополнительно бонус. Грузим один раз при монтировании провайдера.
  const [signupBonusAmount, setSignupBonusAmount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?signup_bonus=1`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (
          !cancelled &&
          data &&
          typeof data.signup_bonus_amount === "number"
        ) {
          setSignupBonusAmount(data.signup_bonus_amount);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
        const orders: { vin: string | null; car_name: string | null }[] =
          data.orders || [];
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
    const hasData =
      form.vin || form.name || form.phone || form.parts || messenger;
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
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) return;
    if (lastLookupPhone.current === digits) return;

    clearTimeout(nameLookupTimer.current);
    nameLookupTimer.current = setTimeout(async () => {
      lastLookupPhone.current = digits;
      try {
        const res = await fetch(
          `${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(digits)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const foundName = data.orders?.[0]?.name;
        if (foundName) {
          setForm((f) =>
            f.phone.replace(/\D/g, "") === digits
              ? { ...f, name: foundName }
              : f,
          );
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
    const digits = form.phone.replace(/\D/g, "");
    if (digits !== autoFilledName.phone) {
      setAutoFilledName(null);
    }
  }, [form.phone, autoFilledName]);

  // Неавторизованный посетитель: имя не раскрываем, но если введённый номер уже есть
  // в базе — прячем поле «Имя» целиком (бэкенд сам подставит имя из первой заявки)
  useEffect(() => {
    if (knownContact || garageAuthed) return;
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setKnownPhoneNoAuth(null);
      return;
    }
    if (lastExistsCheckPhone.current === digits) return;

    clearTimeout(existsCheckTimer.current);
    existsCheckTimer.current = setTimeout(async () => {
      lastExistsCheckPhone.current = digits;
      try {
        const res = await fetch(
          `${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(digits)}&exists_only=1`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setKnownPhoneNoAuth((prev) => {
          const current = form.phone.replace(/\D/g, "");
          if (current !== digits) return prev;
          return data.exists ? digits : null;
        });
      } catch {
        // тихо игнорируем — это необязательная подсказка
      }
    }, 500);

    return () => clearTimeout(existsCheckTimer.current);
  }, [form.phone, knownContact, garageAuthed]);

  useEffect(() => {
    if (!knownPhoneNoAuth) return;
    const digits = form.phone.replace(/\D/g, "");
    if (digits !== knownPhoneNoAuth) {
      setKnownPhoneNoAuth(null);
    }
  }, [form.phone, knownPhoneNoAuth]);

  // Как только телефон введён полностью — проверяем, не привязан ли к нему уже
  // чей-то промокод (промокод друга можно указать только один раз)
  useEffect(() => {
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setPromoAlreadyUsed(false);
      lastPromoUsedCheckPhone.current = "";
      return;
    }
    if (lastPromoUsedCheckPhone.current === digits) return;

    clearTimeout(promoUsedCheckTimer.current);
    promoUsedCheckTimer.current = setTimeout(async () => {
      lastPromoUsedCheckPhone.current = digits;
      try {
        const res = await fetch(
          `${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(digits)}&promo_used=1`,
        );
        if (!res.ok) return;
        const data = await res.json();
        setPromoAlreadyUsed((prev) => {
          const current = form.phone.replace(/\D/g, "");
          if (current !== digits) return prev;
          return !!data.used;
        });
      } catch {
        // тихо игнорируем — это необязательная подсказка
      }
    }, 500);

    return () => clearTimeout(promoUsedCheckTimer.current);
  }, [form.phone]);

  // Сбрасываем результат предыдущей проверки, как только клиент меняет код —
  // старое «Такого промокода не существует» не должно висеть под новым введённым кодом
  useEffect(() => {
    if (lastCheckedPromo.current !== form.promoCode.trim()) {
      setPromoStatus("idle");
    }
  }, [form.promoCode]);

  // Промокод проверяется бэкендом только по явному запросу — при нажатии «Отправить»,
  // чтобы исключить перебор кодов через живую проверку на каждый введённый символ
  const checkPromoCode = async (): Promise<PromoStatus> => {
    const code = form.promoCode.trim();
    if (!code) {
      setPromoStatus("idle");
      return "idle";
    }
    setPromoStatus("checking");
    try {
      const res = await fetch(
        `${GARAGE_LOOKUP_URL}?check_promo=${encodeURIComponent(code)}`,
      );
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      lastCheckedPromo.current = code;
      const status: PromoStatus = data.valid ? "valid" : "invalid";
      setPromoStatus(status);
      return status;
    } catch {
      setPromoStatus("idle");
      return "idle";
    }
  };

  const open = (
    vin?: string,
    incomingPhotos?: File[],
    phone?: string,
    name?: string,
    history?: string[],
    city?: string,
  ) => {
    setForm((f) => ({
      ...f,
      vin: vin ?? f.vin,
      phone: phone ?? f.phone,
      name: name ?? f.name,
      city: city ?? (f.city || getStoredCity()),
    }));
    setKnownContact(isValidName(name) && isValidPhone(phone));
    setAutoFilledName(null);
    setKnownPhoneNoAuth(null);
    lastLookupPhone.current = "";
    lastExistsCheckPhone.current = "";
    setVinHistory(history ?? []);
    setVinSource(vin ? "manual" : null);
    setPromoStatus("idle");
    lastCheckedPromo.current = "";
    setPromoAlreadyUsed(false);
    lastPromoUsedCheckPhone.current = "";
    if (incomingPhotos && incomingPhotos.length > 0) {
      vinPhoto.addPhotos(incomingPhotos);
    }
    setIsOpen(true);
  };

  // Сброс всех полей формы к исходному состоянию после успешной отправки заявки
  const resetForm = () => {
    setForm(emptyForm);
    setMessenger(null);
    setKnownContact(false);
    setAutoFilledName(null);
    setKnownPhoneNoAuth(null);
    setVinSource(null);
    setPromoStatus("idle");
    lastCheckedPromo.current = "";
    setPromoAlreadyUsed(false);
    lastPromoUsedCheckPhone.current = "";
    vinPhoto.resetPhotos();
    partsPhoto.resetPhotos();
    safeRemoveItem(STORAGE_KEY);
  };

  return {
    isOpen,
    setIsOpen,
    form,
    setForm,
    messenger,
    setMessenger,
    vinPhoto,
    partsPhoto,
    knownContact,
    vinHistory,
    garageCars,
    vinSource,
    setVinSource,
    promoStatus,
    checkPromoCode,
    autoFilledName,
    knownPhoneNoAuth,
    promoAlreadyUsed,
    signupBonusAmount,
    open,
    resetForm,
  };
};
