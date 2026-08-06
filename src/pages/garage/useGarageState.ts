import { useEffect, useState } from 'react';
import { useRequest } from '@/components/site/RequestDialog';
import { notifyGarageAuthChanged } from '@/hooks/use-garage-auth';
import { getStoredCity } from '@/lib/garage-city';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import {
  GARAGE_LOOKUP_URL,
  GARAGE_CAR_NAME_URL,
  GARAGE_AUTH_URL,
  STORAGE_KEY,
  PASSWORD_VERIFIED_KEY,
  Order,
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
  const [checkingSaved, setCheckingSaved] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [carNameDrafts, setCarNameDrafts] = useState<Record<number, string>>({});
  const [savedCarNames, setSavedCarNames] = useState<Record<number, string>>({});
  const [savingCarId, setSavingCarId] = useState<number | null>(null);
  const [city, setCity] = useState(() => getStoredCity());
  const [statusTab, setStatusTab] = useState<'in_progress' | 'done'>('in_progress');
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
  const [resetNameInput, setResetNameInput] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const { permission: pushPermission, subscribing: pushSubscribing, subscribe: subscribePush } =
    usePushSubscription(authed ? phone : null);

  const checkHasPassword = async (ph: string) => {
    try {
      const res = await fetch(`${GARAGE_AUTH_URL}?phone=${encodeURIComponent(ph)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.has_password;
    } catch {
      return false;
    }
  };

  const load = async (ph: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(ph)}`);
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      const list: Order[] = data.orders || [];
      if (list.length === 0) {
        setError('По этому номеру заявок не найдено. Оставьте заявку, чтобы получить доступ в гараж.');
        setAuthed(false);
        setPasswordRequired(false);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PASSWORD_VERIFIED_KEY);
        return;
      }
      setOrders(list);
      const names = Object.fromEntries(list.map((o) => [o.id, o.car_name || '']));
      setCarNameDrafts(names);
      setSavedCarNames(names);
      setAuthed(true);
      localStorage.setItem(STORAGE_KEY, ph);
      notifyGarageAuthChanged();
    } catch {
      setError('Не удалось загрузить заказы. Проверьте телефон и попробуйте снова.');
    } finally {
      setLoading(false);
      setCheckingSaved(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPhone(saved);
      // Пароль уже подтверждён в этой сессии — не спрашиваем его повторно при возврате в «Гараж»
      if (localStorage.getItem(PASSWORD_VERIFIED_KEY) === saved) {
        load(saved);
        return;
      }
      (async () => {
        const needsPassword = await checkHasPassword(saved);
        if (needsPassword) {
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
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Укажите корректный телефон');
      return;
    }
    setCheckingPassword(true);
    const needsPassword = await checkHasPassword(phone);
    setCheckingPassword(false);
    if (needsPassword) {
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
      setPasswordRequired(false);
      localStorage.setItem(PASSWORD_VERIFIED_KEY, phone);
      await load(phone);
    } catch {
      setError('Не удалось войти. Попробуйте ещё раз.');
      setLoading(false);
    }
  };

  const submitResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
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
          name: resetNameInput,
          password: resetPasswordInput.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.error || 'Не удалось восстановить пароль');
        setResetLoading(false);
        return;
      }
      // Пароль сброшен — сразу входим с новым паролем
      setResetPasswordMode(false);
      setResetNameInput('');
      setPasswordInput(resetPasswordInput.trim());
      setResetPasswordInput('');
      setPasswordRequired(false);
      localStorage.setItem(PASSWORD_VERIFIED_KEY, phone);
      await load(phone);
    } catch {
      setResetError('Не удалось восстановить пароль. Попробуйте ещё раз.');
    } finally {
      setResetLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PASSWORD_VERIFIED_KEY);
    setAuthed(false);
    setOrders([]);
    setPhone('');
    setPasswordRequired(false);
    setResetPasswordMode(false);
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
      setPasswordSettingsSuccess('Пароль сохранён');
      setTimeout(() => {
        setPasswordSettingsOpen(false);
        setPasswordSettingsSuccess('');
      }, 1200);
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

  const totalCashback = orders.reduce((sum, o) => sum + (o.cashback || 0), 0);
  const knownName = orders[0]?.name;
  const vinHistory = Array.from(new Set(orders.map((o) => o.vin).filter((v): v is string => !!v)));
  const inProgressOrders = orders.filter((o) => o.status !== 'done');
  const doneOrders = orders.filter((o) => o.status === 'done');
  const visibleOrders = statusTab === 'in_progress' ? inProgressOrders : doneOrders;

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

  const onNewRequest = () => open(undefined, undefined, phone, knownName, vinHistory, city);

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
    city,
    setCity,
    statusTab,
    setStatusTab,
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
    resetNameInput,
    setResetNameInput,
    resetPasswordInput,
    setResetPasswordInput,
    resetLoading,
    resetError,
    setResetError,
    pushPermission,
    pushSubscribing,
    subscribePush,
    submit,
    submitPassword,
    submitResetPassword,
    logout,
    openPasswordSettings,
    savePasswordSettings,
    removePasswordSettings,
    totalCashback,
    inProgressOrders,
    doneOrders,
    visibleOrders,
    saveCarName,
    onNewRequest,
  };
};