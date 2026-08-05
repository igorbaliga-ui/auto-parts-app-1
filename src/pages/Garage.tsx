import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { RequestProvider, useRequest } from '@/components/site/RequestDialog';
import PageBackground from '@/components/site/PageBackground';
import ExpandableText from '@/components/shared/ExpandableText';
import { notifyGarageAuthChanged } from '@/hooks/use-garage-auth';
import { cities, getStoredCity, setStoredCity } from '@/lib/garage-city';

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';
const GARAGE_CAR_NAME_URL = 'https://functions.poehali.dev/22aa943f-f262-4beb-b2e2-c713d1684c82';
const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';
const STORAGE_KEY = 'zapoptom_garage_phone';
const PASSWORD_VERIFIED_KEY = 'zapoptom_garage_password_verified';

type Order = {
  id: number;
  vin: string | null;
  name: string;
  phone: string;
  parts: string | null;
  messenger: string | null;
  order_amount: number | null;
  cashback: number | null;
  created_at: string;
  car_name: string | null;
  city: string | null;
  status: 'in_progress' | 'done';
  completed_at: string | null;
};

const messengerLabel: Record<string, string> = {
  telegram: 'Telegram',
  max: 'MAX',
  whatsapp: 'WhatsApp',
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';

const GarageContent = () => {
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
  const [passwordSettingsError, setPasswordSettingsError] = useState('');
  const [passwordSettingsLoading, setPasswordSettingsLoading] = useState(false);
  const [passwordSettingsSuccess, setPasswordSettingsSuccess] = useState('');

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

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PASSWORD_VERIFIED_KEY);
    setAuthed(false);
    setOrders([]);
    setPhone('');
    setPasswordRequired(false);
    notifyGarageAuthChanged();
  };

  const openPasswordSettings = async () => {
    setPasswordSettingsError('');
    setPasswordSettingsSuccess('');
    setOldPasswordInput('');
    setNewPasswordInput('');
    const has = await checkHasPassword(phone);
    setHasPassword(has);
    setPasswordSettingsOpen(true);
  };

  const savePasswordSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSettingsError('');
    setPasswordSettingsSuccess('');
    if (newPasswordInput.trim().length < 4) {
      setPasswordSettingsError('Пароль — не менее 4 символов');
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
      setPasswordSettingsSuccess('Пароль сохранён');
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

  if (checkingSaved) {
    return (
      <PageBackground>
        <div className="min-h-screen flex items-center justify-center px-5">
          <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center animate-pulse">
            <Icon name="Warehouse" className="text-primary" size={28} />
          </span>
        </div>
      </PageBackground>
    );
  }

  if (!authed && passwordRequired) {
    return (
      <PageBackground>
        <div className="min-h-screen flex items-center justify-center px-5">
          <form
            onSubmit={submitPassword}
            className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
          >
            <div className="flex justify-center mb-2">
              <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
                <Icon name="Lock" className="text-primary" size={28} />
              </span>
            </div>
            <h1 className="font-head uppercase tracking-wide text-2xl text-center">
              Введите пароль
            </h1>
            <p className="text-muted-foreground text-sm text-center">
              Для номера {phone} задан пароль. Введите его, чтобы войти в гараж.
            </p>
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Пароль"
              autoFocus
            />
            {error && <p className="text-primary text-sm text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="font-head uppercase tracking-wide h-11">
              {loading ? 'Входим…' : 'Войти'}
            </Button>
            <button
              type="button"
              onClick={() => {
                setPasswordRequired(false);
                setPasswordInput('');
                setError('');
              }}
              className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Ввести другой номер
            </button>
          </form>
        </div>
      </PageBackground>
    );
  }

  if (!authed) {
    return (
      <PageBackground>
        <div className="min-h-screen flex items-center justify-center px-5">
          <form
            onSubmit={submit}
            className="w-full max-w-[380px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
          >
            <div className="flex justify-center mb-2">
              <span className="w-14 h-14 rounded-sm bg-primary/15 flex items-center justify-center">
                <Icon name="Warehouse" className="text-primary" size={28} />
              </span>
            </div>
            <h1 className="font-head uppercase tracking-wide text-2xl text-center">
              Гараж
            </h1>
            <p className="text-muted-foreground text-sm text-center">
              Введите телефон, который указывали в заявке — покажем ваши заказы.
            </p>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={12}
              placeholder="+7 900 000-00-00"
              autoFocus
            />
            {error && <p className="text-primary text-sm text-center">{error}</p>}
            <Button type="submit" disabled={loading || checkingPassword} className="font-head uppercase tracking-wide h-11">
              {loading || checkingPassword ? 'Загружаем…' : 'Войти'}
            </Button>
            <a href="/" className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
              На главную
            </a>
          </form>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground>
    <div className="min-h-screen text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex items-center justify-between mb-5 sm:mb-2 gap-2">
          <Link
            to="/"
            className="sm:hidden flex items-center gap-2 text-muted-foreground text-sm font-head uppercase tracking-wide hover:text-primary transition-colors w-fit"
          >
            <Icon name="ArrowLeft" size={16} />
            На главную
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              aria-label="На главную"
              title="На главную"
              className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 rounded-sm bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors"
            >
              <Icon name="Warehouse" className="text-primary" size={20} />
            </Link>
            <h1 className="font-head uppercase tracking-wide text-xl sm:text-2xl whitespace-nowrap">Мой гараж</h1>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-primary transition-colors mb-4 sm:mb-6">
              <Icon name="MapPin" size={14} />
              {city}
              <Icon name="ChevronDown" size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {cities.map((c) => (
              <DropdownMenuItem
                key={c}
                onClick={() => {
                  setCity(c);
                  setStoredCity(c);
                }}
              >
                {c}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center justify-end mb-6 sm:mb-2 gap-2">
          <Link
            to="/"
            className="hidden sm:flex items-center justify-center h-10 px-4 rounded-sm border border-steel text-muted-foreground text-sm font-head uppercase tracking-wide hover:border-primary/60 hover:text-foreground transition-colors"
          >
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            На главную
          </Link>
          <Button
            onClick={() => open(undefined, undefined, phone, knownName, vinHistory, city)}
            className="font-head uppercase tracking-wide text-sm h-10 px-4 flex-1 sm:flex-initial whitespace-nowrap"
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Новая заявка
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={openPasswordSettings}
            className="h-10 w-10 shrink-0"
            title="Пароль для входа"
          >
            <Icon name="Lock" size={16} />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setLogoutConfirmOpen(true)}
            className="h-10 w-10 shrink-0"
            title="Выйти"
          >
            <Icon name="LogOut" size={16} />
          </Button>
        </div>

        <Dialog open={passwordSettingsOpen} onOpenChange={setPasswordSettingsOpen}>
          <DialogContent className="bg-card border-border sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-head uppercase tracking-wide text-xl">
                {hasPassword ? 'Пароль для входа' : 'Задать пароль'}
              </DialogTitle>
              <DialogDescription>
                {hasPassword
                  ? 'Пароль защищает доступ к вашим заказам по этому номеру телефона.'
                  : 'Необязательно: задайте пароль, чтобы дополнительно защитить доступ к заказам.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={savePasswordSettings} className="flex flex-col gap-3 mt-1">
              {hasPassword && (
                <div>
                  <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                    Текущий пароль
                  </label>
                  <Input
                    type="password"
                    value={oldPasswordInput}
                    onChange={(e) => setOldPasswordInput(e.target.value)}
                    placeholder="Текущий пароль"
                    className="mt-1.5 bg-background"
                  />
                </div>
              )}
              <div>
                <label className="font-head uppercase tracking-[0.12em] text-xs text-muted-foreground">
                  {hasPassword ? 'Новый пароль' : 'Пароль'}
                </label>
                <Input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Не менее 4 символов"
                  className="mt-1.5 bg-background"
                />
              </div>
              {passwordSettingsError && (
                <p className="text-primary text-sm">{passwordSettingsError}</p>
              )}
              {passwordSettingsSuccess && (
                <p className="text-primary text-sm">{passwordSettingsSuccess}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="submit"
                  disabled={passwordSettingsLoading}
                  className="font-head uppercase tracking-wide flex-1"
                >
                  {passwordSettingsLoading ? 'Сохраняем…' : hasPassword ? 'Сменить пароль' : 'Сохранить'}
                </Button>
                {hasPassword && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={passwordSettingsLoading}
                    onClick={removePasswordSettings}
                    className="font-head uppercase tracking-wide"
                  >
                    Убрать пароль
                  </Button>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-head uppercase tracking-wide">
                Выйти из гаража?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Вам нужно будет заново ввести номер телефона, чтобы снова увидеть свои заказы.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-head uppercase tracking-wide">
                Отмена
              </AlertDialogCancel>
              <AlertDialogAction onClick={logout} className="font-head uppercase tracking-wide">
                Выйти
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {orders.length > 0 && (
          <div className="mb-8 mt-6">
            <div className="bg-card border border-primary/40 rounded-sm p-6">
              <span className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                Накопленный кэшбэк
              </span>
              <div className="font-head text-3xl mt-1 text-primary">
                {formatMoney(totalCashback)}
              </div>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="mt-8 flex flex-col items-start gap-4">
            <p className="text-muted-foreground">
              По этому телефону заказов пока нет.
            </p>
            <Button onClick={() => open(undefined, undefined, phone, knownName, vinHistory, city)} className="font-head uppercase tracking-wide">
              <Icon name="Plus" size={16} className="mr-2" />
              Оставить заявку
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStatusTab('in_progress')}
                className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
                  statusTab === 'in_progress'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-steel text-muted-foreground hover:border-primary/60'
                }`}
              >
                В работе ({inProgressOrders.length})
              </button>
              <button
                onClick={() => setStatusTab('done')}
                className={`h-10 px-4 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors ${
                  statusTab === 'done'
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-steel text-muted-foreground hover:border-primary/60'
                }`}
              >
                Выполненные ({doneOrders.length})
              </button>
            </div>

            {visibleOrders.length === 0 ? (
              <p className="text-muted-foreground mt-4">
                {statusTab === 'in_progress' ? 'Нет заказов в работе.' : 'Нет выполненных заказов.'}
              </p>
            ) : (
          <div className="flex flex-col gap-4 mt-2">
            {visibleOrders.map((o) => (
              <div key={o.id} className="bg-card border border-steel rounded-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-head tracking-[0.1em] text-lg">
                    {o.vin || 'VIN не указан (по фото)'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[0.65rem] font-head uppercase tracking-wide px-2 py-1 rounded-sm ${
                        o.status === 'done'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {o.status === 'done' ? 'Выполнен' : 'В работе'}
                    </span>
                    <span className="text-muted-foreground text-xs">{formatDate(o.created_at)}</span>
                  </div>
                </div>
                {o.status === 'done' && o.completed_at && (
                  <p className="text-primary/80 text-xs mb-3 -mt-2">
                    Выполнен: {formatDate(o.completed_at)}
                  </p>
                )}
                {o.vin && (
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      value={carNameDrafts[o.id] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCarNameDrafts((d) => ({ ...d, [o.id]: value }));
                      }}
                      maxLength={25}
                      placeholder="Название автомобиля, например Toyota Camry"
                      className="h-9 text-sm bg-background max-w-xs"
                    />
                    {(carNameDrafts[o.id] ?? '').trim() !== (savedCarNames[o.id] ?? '').trim() && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={savingCarId === o.id}
                        onClick={() => saveCarName(o)}
                        className="h-9 font-head uppercase tracking-wide text-xs"
                      >
                        {savingCarId === o.id ? '…' : 'Сохранить'}
                      </Button>
                    )}
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Имя: </span>
                    <span>{o.name}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Телефон: </span>
                    <span>{o.phone}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Город: </span>
                    <span>{o.city || '—'}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Мессенджер: </span>
                    <span>{o.messenger ? messengerLabel[o.messenger] ?? o.messenger : '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-foreground block mb-1">Запчасти:</span>
                    <ExpandableText text={o.parts} label="Интересующие запчасти" className="text-left" />
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Сумма заказа: </span>
                    <span>{o.order_amount != null ? formatMoney(o.order_amount) : 'Уточняется'}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Кэшбэк: </span>
                    <span className="text-primary">
                      {o.cashback != null ? formatMoney(o.cashback) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        )}
      </div>
    </div>
    </PageBackground>
  );
};

const Garage = () => (
  <RequestProvider>
    <GarageContent />
  </RequestProvider>
);

export default Garage;