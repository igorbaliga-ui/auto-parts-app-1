import { useEffect, useState } from 'react';
import { useRequest } from '@/components/site/RequestDialog';
import { notifyGarageAuthChanged } from '@/hooks/use-garage-auth';
import { getStoredCity } from '@/lib/garage-city';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/storage';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { setAppBadge } from '@/lib/app-badge';
import { toast } from '@/hooks/use-toast';
import { sanitizeMileageInput, MILEAGE_MAX_VALUE } from '@/lib/text';
import { usePhoneChange } from './usePhoneChange';
import {
  GARAGE_LOOKUP_URL,
  GARAGE_CAR_NAME_URL,
  GARAGE_AUTH_URL,
  GARAGE_MILEAGE_URL,
  STORAGE_KEY,
  PASSWORD_VERIFIED_KEY,
  Order,
  CashbackHistoryItem,
  ReferralFriend,
} from './garageTypes';

/**
 * Вся логика личного кабинета «Гараж»: авторизация по телефону (с опциональным
 * паролем и его восстановлением), загрузка заказов, редактирование названия
 * авто, настройки пароля, выход. Вынесено из Garage.tsx, чтобы сам компонент
 * страницы был только вёрсткой (выбором нужного view по текущему состоянию).
 */
export const useGarageState = () => {
  const { open } = useRequest();
  const [phone, setPhone] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSaved, setCheckingSaved] = useState(() => !!safeGetItem(STORAGE_KEY));
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [cashbackDeducted, setCashbackDeducted] = useState(0);
  const [cashbackHistory, setCashbackHistory] = useState<CashbackHistoryItem[]>([]);
  const [cashbackHistoryOpen, setCashbackHistoryOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralBonusTotal, setReferralBonusTotal] = useState(0);
  const [referralPercent, setReferralPercent] = useState(2);
  const [cashbackPercent, setCashbackPercent] = useState(3);
  const [referrals, setReferrals] = useState<ReferralFriend[]>([]);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  // Имя друга, чей промокод клиент уже применил (сам ввёл при заявке или позже в «Гараже»)
  const [referredByName, setReferredByName] = useState<string | null>(null);
  const [applyingReferralCode, setApplyingReferralCode] = useState(false);
  const [applyReferralCodeError, setApplyReferralCodeError] = useState('');
  const [carNameDrafts, setCarNameDrafts] = useState<Record<number, string>>({});
  const [savedCarNames, setSavedCarNames] = useState<Record<number, string>>({});
  const [savingCarId, setSavingCarId] = useState<number | null>(null);
  const [mileageDrafts, setMileageDrafts] = useState<Record<number, string>>({});
  const [savedMileages, setSavedMileages] = useState<Record<number, string>>({});
  const [savingMileageId, setSavingMileageId] = useState<number | null>(null);
  const [mileageErrors, setMileageErrors] = useState<Record<number, string>>({});
  const [city, setCity] = useState(() => getStoredCity());
  const [statusTab, setStatusTab] = useState<'new' | 'in_progress' | 'done'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [passwordSettingsOpen, setPasswordSettingsOpen] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPasswordConfirmInput, setNewPasswordConfirmInput] = useState('');
  const [passwordSettingsError, setPasswordSettingsError] = useState('');
  const [passwordSettingsLoading, setPasswordSettingsLoading] = useState(false);
  const [passwordSettingsSuccess, setPasswordSettingsSuccess] = useState('');
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  // Восстановление забытого пароля подтверждается отдельным звонком (даже если номер уже
  // был подтверждён ранее для входа) — свой набор состояний, не пересекающийся с обычной
  // верификацией номера при входе (callRequested/codeInput/callCooldown выше)
  const [resetCallRequested, setResetCallRequested] = useState(false);
  const [resetCallLoading, setResetCallLoading] = useState(false);
  const [resetCodeInput, setResetCodeInput] = useState('');
  const [resetCallCooldown, setResetCallCooldown] = useState(0);
  const [callVerificationRequired, setCallVerificationRequired] = useState(false);
  const [callRequested, setCallRequested] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [callCooldown, setCallCooldown] = useState(0);
  const { permission: pushPermission, subscribing: pushSubscribing, subscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush } =
    usePushSubscription(authed ? phone : null);

  const checkAccountStatus = async (ph: string) => {
    try {
      const res = await fetch(`${GARAGE_AUTH_URL}?phone=${encodeURIComponent(ph)}`);
      if (!res.ok) return { hasPassword: false, phoneVerified: false };
      const data = await res.json();
      return { hasPassword: !!data.has_password, phoneVerified: !!data.phone_verified };
    } catch {
      return { hasPassword: false, phoneVerified: false };
    }
  };

  const checkHasPassword = async (ph: string) => (await checkAccountStatus(ph)).hasPassword;

  useEffect(() => {
    if (callCooldown <= 0) return;
    const t = setTimeout(() => setCallCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [callCooldown]);

  useEffect(() => {
    if (resetCallCooldown <= 0) return;
    const t = setTimeout(() => setResetCallCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resetCallCooldown]);

  const requestCall = async () => {
    setError('');
    setCallLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_call_verification', phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Не удалось совершить звонок');
        return;
      }
      setCallRequested(true);
      setCodeInput('');
      setCallCooldown(60);
    } catch {
      setError('Не удалось совершить звонок. Попробуйте ещё раз.');
    } finally {
      setCallLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_call', phone, code: codeInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Неверный код');
        return;
      }
      setCallVerificationRequired(false);
      setCallRequested(false);
      setCodeInput('');
      const needsPassword = await checkHasPassword(phone);
      if (needsPassword) {
        setPasswordRequired(true);
        return;
      }
      load(phone);
    } catch {
      setError('Не удалось подтвердить код. Попробуйте ещё раз.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const backToPhoneFromCall = () => {
    setCallVerificationRequired(false);
    setCallRequested(false);
    setCodeInput('');
    setError('');
  };

  const load = async (ph: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(ph)}`);
      if (res.status === 429) {
        setError('Слишком много запросов. Подождите немного и попробуйте снова.');
        return;
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру');
        setAuthed(false);
        setPasswordRequired(false);
        safeRemoveItem(STORAGE_KEY);
        safeRemoveItem(PASSWORD_VERIFIED_KEY);
        return;
      }
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      const list: Order[] = data.orders || [];
      if (list.length === 0) {
        setError('По этому номеру заявок не найдено. Оставьте заявку, чтобы получить доступ в гараж.');
        setAuthed(false);
        setPasswordRequired(false);
        safeRemoveItem(STORAGE_KEY);
        safeRemoveItem(PASSWORD_VERIFIED_KEY);
        return;
      }
      setOrders(list);
      setCashbackDeducted(typeof data.cashback_deducted === 'number' ? data.cashback_deducted : 0);
      setCashbackHistory(Array.isArray(data.cashback_history) ? data.cashback_history : []);
      setReferralCode(typeof data.referral_code === 'string' ? data.referral_code : null);
      setReferralBonusTotal(typeof data.referral_bonus_total === 'number' ? data.referral_bonus_total : 0);
      setReferralPercent(typeof data.referral_percent === 'number' ? data.referral_percent : 2);
      setCashbackPercent(typeof data.cashback_percent === 'number' ? data.cashback_percent : 3);
      setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      setReferredByName(typeof data.referred_by_name === 'string' ? data.referred_by_name : null);
      // По умолчанию открываем «Новые», но если там пусто — сразу показываем «В работе»
      const activeList = list.filter((o) => !o.archived);
      if (!activeList.some((o) => o.status === 'new') && activeList.some((o) => o.status === 'in_progress')) {
        setStatusTab('in_progress');
      }
      const names = Object.fromEntries(list.map((o) => [o.id, o.car_name || '']));
      setCarNameDrafts(names);
      setSavedCarNames(names);
      const mileages = Object.fromEntries(
        list.map((o) => [o.id, o.mileage != null ? String(o.mileage) : '']),
      );
      setMileageDrafts(mileages);
      setSavedMileages(mileages);
      // Узнаём наличие пароля до показа страницы, чтобы иконка замка сразу
      // отрисовалась в верном состоянии — без короткой вспышки индикатора
      // «пароль не задан», пока идёт запрос
      setHasPassword(await checkHasPassword(ph));
      setAuthed(true);
      safeSetItem(STORAGE_KEY, ph);
      notifyGarageAuthChanged();
    } catch {
      setError('Не удалось загрузить заказы. Проверьте телефон и попробуйте снова.');
    } finally {
      setLoading(false);
      setCheckingSaved(false);
    }
  };

  useEffect(() => {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved) {
      setPhone(saved);
      // Пароль уже подтверждён в этой сессии — не спрашиваем его повторно при возврате в «Гараж»
      if (safeGetItem(PASSWORD_VERIFIED_KEY) === saved) {
        load(saved);
        return;
      }
      (async () => {
        const { hasPassword, phoneVerified } = await checkAccountStatus(saved);
        if (!phoneVerified) {
          setCallVerificationRequired(true);
          setCheckingSaved(false);
        } else if (hasPassword) {
          setPasswordRequired(true);
          setCheckingSaved(false);
        } else {
          load(saved);
        }
      })();
    } else {
      setCheckingSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 11) {
      setError('Телефон указан не полностью');
      return;
    }
    setCheckingPassword(true);
    const { hasPassword, phoneVerified } = await checkAccountStatus(phone);
    setCheckingPassword(false);
    if (!phoneVerified) {
      setCallVerificationRequired(true);
      setError('');
      return;
    }
    if (hasPassword) {
      setPasswordRequired(true);
      setError('');
      return;
    }
    load(phone);
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', phone, password: passwordInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Неверный пароль');
        setLoading(false);
        return;
      }
      setPasswordInput('');
      safeSetItem(PASSWORD_VERIFIED_KEY, phone);
      // passwordRequired специально сбрасываем только ПОСЛЕ загрузки заказов: пока идёт
      // load(), authed ещё false, и если сбросить passwordRequired раньше, экран на
      // мгновение провалится в форму ввода телефона (условие рендера в Garage.tsx) —
      // получается заметное мигание между формой пароля и формой телефона
      await load(phone);
      setPasswordRequired(false);
    } catch {
      setError('Не удалось войти. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  const requestResetCall = async () => {
    setResetError('');
    setResetCallLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_password_reset_call', phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.error || 'Не удалось совершить звонок');
        return;
      }
      setResetCallRequested(true);
      setResetCodeInput('');
      setResetCallCooldown(60);
    } catch {
      setResetError('Не удалось совершить звонок. Попробуйте ещё раз.');
    } finally {
      setResetCallLoading(false);
    }
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (resetCodeInput.trim().length !== 4) {
      setResetError('Введите 4 цифры из звонка');
      return;
    }
    if (resetPasswordInput.trim().length !== 4) {
      setResetError('Пароль — ровно 4 символа');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          phone,
          code: resetCodeInput.trim(),
          password: resetPasswordInput.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.error || 'Не удалось восстановить пароль');
        setResetLoading(false);
        return;
      }
      // Пароль сброшен — сразу входим с новым паролем.
      // resetPasswordMode/passwordRequired сбрасываем только ПОСЛЕ load(), по той же
      // причине, что и в submitPassword — иначе экран на мгновение проваливается
      // в форму ввода телефона, пока authed ещё не стал true
      setResetCallRequested(false);
      setResetCodeInput('');
      setPasswordInput(resetPasswordInput.trim());
      setResetPasswordInput('');
      safeSetItem(PASSWORD_VERIFIED_KEY, phone);
      await load(phone);
      setResetPasswordMode(false);
      setPasswordRequired(false);
    } catch {
      setResetError('Не удалось восстановить пароль. Попробуйте ещё раз.');
    } finally {
      setResetLoading(false);
    }
  };

  const backToPasswordFromReset = () => {
    setResetPasswordMode(false);
    setResetCallRequested(false);
    setResetCodeInput('');
    setResetPasswordInput('');
    setResetError('');
  };

  const logout = () => {
    // Отписываем это устройство от push-уведомлений о заказах вышедшего клиента — иначе
    // при входе другого человека в «Гараж» на том же телефоне/браузере ему бы не пришлось
    // включать уведомления заново, но и старый клиент продолжал бы их получать
    unsubscribePush();
    safeRemoveItem(STORAGE_KEY);
    safeRemoveItem(PASSWORD_VERIFIED_KEY);
    setAuthed(false);
    setOrders([]);
    setPhone('');
    setPasswordRequired(false);
    setResetPasswordMode(false);
    setCallVerificationRequired(false);
    setCallRequested(false);
    setCodeInput('');
    notifyGarageAuthChanged();
  };

  const openPasswordSettings = async () => {
    setPasswordSettingsError('');
    setPasswordSettingsSuccess('');
    setOldPasswordInput('');
    setNewPasswordInput('');
    setNewPasswordConfirmInput('');
    const has = await checkHasPassword(phone);
    setHasPassword(has);
    setPasswordSettingsOpen(true);
  };

  const savePasswordSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSettingsError('');
    setPasswordSettingsSuccess('');
    if (newPasswordInput.trim().length !== 4) {
      setPasswordSettingsError('Пароль — ровно 4 символа');
      return;
    }
    if (newPasswordInput.trim() !== newPasswordConfirmInput.trim()) {
      setPasswordSettingsError('Пароли не совпадают');
      return;
    }
    setPasswordSettingsLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_password',
          phone,
          password: newPasswordInput.trim(),
          old_password: oldPasswordInput,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordSettingsError(data.error || 'Не удалось сохранить пароль');
        return;
      }
      setHasPassword(true);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setNewPasswordConfirmInput('');
      // Пароль только что задан в этой же сессии — сразу отмечаем его подтверждённым,
      // чтобы при возврате в «Гараж» не спрашивать его повторно
      safeSetItem(PASSWORD_VERIFIED_KEY, phone);
      setPasswordSettingsOpen(false);
      toast({ title: 'Пароль сохранён' });
    } catch {
      setPasswordSettingsError('Не удалось сохранить пароль');
    } finally {
      setPasswordSettingsLoading(false);
    }
  };

  const removePasswordSettings = async () => {
    setPasswordSettingsError('');
    setPasswordSettingsSuccess('');
    setPasswordSettingsLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_password', phone, old_password: oldPasswordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordSettingsError(data.error || 'Не удалось удалить пароль');
        return;
      }
      setHasPassword(false);
      setOldPasswordInput('');
      setNewPasswordInput('');
      setNewPasswordConfirmInput('');
      setPasswordSettingsSuccess('Пароль удалён');
    } catch {
      setPasswordSettingsError('Не удалось удалить пароль');
    } finally {
      setPasswordSettingsLoading(false);
    }
  };

  const totalCashback = orders.reduce((sum, o) => sum + (o.cashback || 0), 0) + referralBonusTotal - cashbackDeducted;
  const knownName = orders[0]?.name;
  const vinHistory = Array.from(new Set(orders.map((o) => o.vin).filter((v): v is string => !!v)));
  const activeOrders = orders.filter((o) => !o.archived);
  const archivedOrders = orders.filter((o) => o.archived);
  const matchesSearch = (o: Order) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (o.vin || '').toLowerCase().includes(q) ||
      (o.car_name || '').toLowerCase().includes(q)
    );
  };
  const searchedOrders = activeOrders.filter(matchesSearch);
  const newOrders = searchedOrders.filter((o) => o.status === 'new');
  const inProgressOrders = searchedOrders.filter((o) => o.status === 'in_progress');
  const doneOrders = searchedOrders.filter((o) => o.status === 'done');
  const visibleOrders =
    statusTab === 'new' ? newOrders : statusTab === 'in_progress' ? inProgressOrders : doneOrders;

  // Точка с числом новых заказов на иконке «Гаража» на рабочем столе (Badging API) —
  // обновляется при каждой загрузке/изменении списка, сбрасывается при выходе
  useEffect(() => {
    setAppBadge(authed ? newOrders.length : 0);
  }, [authed, newOrders.length]);

  const saveCarName = async (order: Order) => {
    if (!order.vin) return;
    const carName = (carNameDrafts[order.id] || '').trim();
    setSavingCarId(order.id);
    try {
      const res = await fetch(GARAGE_CAR_NAME_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, vin: order.vin, car_name: carName }),
      });
      if (!res.ok) throw new Error('request failed');
      setOrders((list) =>
        list.map((o) => (o.vin === order.vin ? { ...o, car_name: carName || null } : o)),
      );
      setCarNameDrafts((d) => {
        const next = { ...d };
        orders.forEach((o) => {
          if (o.vin === order.vin) next[o.id] = carName;
        });
        return next;
      });
      setSavedCarNames((s) => {
        const next = { ...s };
        orders.forEach((o) => {
          if (o.vin === order.vin) next[o.id] = carName;
        });
        return next;
      });
    } catch {
      setError('Не удалось сохранить название автомобиля');
    } finally {
      setSavingCarId(null);
    }
  };

  const saveMileage = async (order: Order) => {
    if (!order.vin) return;
    const raw = sanitizeMileageInput(mileageDrafts[order.id] || '');
    if (raw && Number(raw) > MILEAGE_MAX_VALUE) {
      setMileageErrors((e) => ({ ...e, [order.id]: 'Слишком большое значение' }));
      return;
    }
    setMileageErrors((e) => {
      const next = { ...e };
      delete next[order.id];
      return next;
    });
    setSavingMileageId(order.id);
    try {
      const res = await fetch(GARAGE_MILEAGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, vin: order.vin, mileage: raw || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'request failed');
      }
      const mileageValue = raw ? Number(raw) : null;
      setOrders((list) =>
        list.map((o) => (o.vin === order.vin ? { ...o, mileage: mileageValue } : o)),
      );
      setMileageDrafts((d) => {
        const next = { ...d };
        orders.forEach((o) => {
          if (o.vin === order.vin) next[o.id] = raw;
        });
        return next;
      });
      setSavedMileages((s) => {
        const next = { ...s };
        orders.forEach((o) => {
          if (o.vin === order.vin) next[o.id] = raw;
        });
        return next;
      });
    } catch (err) {
      setMileageErrors((e) => ({
        ...e,
        [order.id]: err instanceof Error && err.message !== 'request failed' ? err.message : 'Не удалось сохранить пробег',
      }));
    } finally {
      setSavingMileageId(null);
    }
  };

  const onNewRequest = () => open(undefined, undefined, phone, knownName, vinHistory, city);

  // После успешной смены номера (подтверждённой звонком, данные уже перенесены на бэкенде)
  // переключаем сессию на новый номер и тихо перезагружаем список заказов под ним
  const onPhoneChanged = (updatedPhone: string) => {
    setPhone(updatedPhone);
    safeSetItem(STORAGE_KEY, updatedPhone);
    safeRemoveItem(PASSWORD_VERIFIED_KEY);
    toast({ title: 'Номер телефона изменён', description: 'Все ваши данные перенесены на новый номер.' });
    load(updatedPhone);
  };

  const phoneChange = usePhoneChange(phone, onPhoneChanged);

  const refresh = async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return;
      const data = await res.json();
      const list: Order[] = data.orders || [];
      if (list.length === 0) return;
      setOrders(list);
      setCashbackDeducted(typeof data.cashback_deducted === 'number' ? data.cashback_deducted : 0);
      setCashbackHistory(Array.isArray(data.cashback_history) ? data.cashback_history : []);
      setReferralCode(typeof data.referral_code === 'string' ? data.referral_code : null);
      setReferralBonusTotal(typeof data.referral_bonus_total === 'number' ? data.referral_bonus_total : 0);
      setReferralPercent(typeof data.referral_percent === 'number' ? data.referral_percent : 2);
      setCashbackPercent(typeof data.cashback_percent === 'number' ? data.cashback_percent : 3);
      setReferrals(Array.isArray(data.referrals) ? data.referrals : []);
      setReferredByName(typeof data.referred_by_name === 'string' ? data.referred_by_name : null);
      const names = Object.fromEntries(list.map((o) => [o.id, o.car_name || '']));
      setCarNameDrafts(names);
      setSavedCarNames(names);
      const mileages = Object.fromEntries(
        list.map((o) => [o.id, o.mileage != null ? String(o.mileage) : '']),
      );
      setMileageDrafts(mileages);
      setSavedMileages(mileages);
    } catch {
      // тихо игнорируем — свайп для обновления не должен показывать ошибки
    }
  };

  // Клиент вводит промокод друга прямо в «Гараже» (если не указал его при отправке заявки).
  // Применить можно только один раз — бэкенд отклонит повторную попытку.
  const applyReferralCode = async (code: string) => {
    setApplyReferralCodeError('');
    setApplyingReferralCode(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_referral_code', phone, referral_code: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setApplyReferralCodeError(data.error || 'Не удалось применить промокод');
        return false;
      }
      setReferredByName(typeof data.referred_by_name === 'string' ? data.referred_by_name : null);
      toast({ title: 'Промокод применён' });
      return true;
    } catch {
      setApplyReferralCodeError('Не удалось применить промокод. Попробуйте ещё раз.');
      return false;
    } finally {
      setApplyingReferralCode(false);
    }
  };

  // Заявка отправлена прямо из «Гаража» (форма поверх этой же страницы) — тихо
  // подгружаем список заказов в фоне, не закрывая диалог и не перезагружая страницу
  useEffect(() => {
    if (!authed) return;
    const onOrdersChanged = () => {
      refresh();
    };
    window.addEventListener('garage-orders-changed', onOrdersChanged);
    return () => window.removeEventListener('garage-orders-changed', onOrdersChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, phone]);

  // Клиент был на «Гараже» ещё не авторизован (номер не найден среди заявок),
  // прямо там же оставил заявку через «Оставьте заявку» — сразу после её
  // успешной отправки переключаем экран со входа на список заказов, без
  // повторного ввода телефона.
  useEffect(() => {
    if (authed) return;
    const onAuthChanged = () => {
      const saved = safeGetItem(STORAGE_KEY);
      if (saved) {
        setPhone(saved);
        load(saved);
      }
    };
    window.addEventListener('garage-auth-changed', onAuthChanged);
    return () => window.removeEventListener('garage-auth-changed', onAuthChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  return {
    phone,
    setPhone,
    authed,
    loading,
    checkingSaved,
    error,
    setError,
    orders,
    carNameDrafts,
    setCarNameDrafts,
    savedCarNames,
    savingCarId,
    mileageDrafts,
    setMileageDrafts,
    savedMileages,
    savingMileageId,
    mileageErrors,
    city,
    setCity,
    statusTab,
    setStatusTab,
    searchQuery,
    setSearchQuery,
    knownName,
    logoutConfirmOpen,
    setLogoutConfirmOpen,
    passwordRequired,
    setPasswordRequired,
    passwordInput,
    setPasswordInput,
    checkingPassword,
    passwordSettingsOpen,
    setPasswordSettingsOpen,
    hasPassword,
    oldPasswordInput,
    setOldPasswordInput,
    newPasswordInput,
    setNewPasswordInput,
    newPasswordConfirmInput,
    setNewPasswordConfirmInput,
    passwordSettingsError,
    passwordSettingsLoading,
    passwordSettingsSuccess,
    resetPasswordMode,
    setResetPasswordMode,
    resetPasswordInput,
    setResetPasswordInput,
    resetLoading,
    resetError,
    setResetError,
    resetCallRequested,
    resetCallLoading,
    resetCodeInput,
    setResetCodeInput,
    resetCallCooldown,
    requestResetCall,
    backToPasswordFromReset,
    callVerificationRequired,
    callRequested,
    callLoading,
    codeInput,
    setCodeInput,
    verifyLoading,
    callCooldown,
    requestCall,
    submitCode,
    backToPhoneFromCall,
    pushPermission,
    pushSubscribing,
    pushSubscribed,
    subscribePush,
    submit,
    submitPassword,
    submitResetPassword,
    logout,
    openPasswordSettings,
    savePasswordSettings,
    removePasswordSettings,
    refresh,
    totalCashback,
    cashbackHistory,
    cashbackHistoryOpen,
    setCashbackHistoryOpen,
    referralCode,
    referralBonusTotal,
    referralPercent,
    cashbackPercent,
    referrals,
    referralDialogOpen,
    setReferralDialogOpen,
    referredByName,
    applyReferralCode,
    applyingReferralCode,
    applyReferralCodeError,
    setApplyReferralCodeError,
    newOrders,
    inProgressOrders,
    doneOrders,
    archivedOrders,
    visibleOrders,
    archiveDialogOpen,
    setArchiveDialogOpen,
    saveCarName,
    saveMileage,
    onNewRequest,
    phoneChange,
  };
};