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
import { RequestProvider, useRequest } from '@/components/site/RequestDialog';
import { notifyGarageAuthChanged } from '@/hooks/use-garage-auth';
import { cities, getStoredCity, setStoredCity } from '@/lib/garage-city';

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';
const GARAGE_CAR_NAME_URL = 'https://functions.poehali.dev/22aa943f-f262-4beb-b2e2-c713d1684c82';
const STORAGE_KEY = 'zapoptom_garage_phone';

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
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [carNameDrafts, setCarNameDrafts] = useState<Record<number, string>>({});
  const [savedCarNames, setSavedCarNames] = useState<Record<number, string>>({});
  const [savingCarId, setSavingCarId] = useState<number | null>(null);
  const [city, setCity] = useState(() => getStoredCity());

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
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setPhone(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Укажите корректный телефон');
      return;
    }
    load(phone);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
    setOrders([]);
    setPhone('');
    notifyGarageAuthChanged();
  };

  const totalCashback = orders.reduce((sum, o) => sum + (o.cashback || 0), 0);
  const knownName = orders[0]?.name;
  const vinHistory = Array.from(new Set(orders.map((o) => o.vin).filter((v): v is string => !!v)));

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
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
            placeholder="+7 900 000-00-00"
            autoFocus
          />
          {error && <p className="text-primary text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="font-head uppercase tracking-wide h-11">
            {loading ? 'Загружаем…' : 'Войти'}
          </Button>
          <a href="/" className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
            На главную
          </a>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="max-w-[1000px] mx-auto">
        <Link
          to="/"
          className="sm:hidden flex items-center gap-2 mb-5 text-muted-foreground text-sm font-head uppercase tracking-wide hover:text-primary transition-colors w-fit"
        >
          <Icon name="ArrowLeft" size={16} />
          На главную
        </Link>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="На главную"
              title="На главную"
              className="w-11 h-11 rounded-sm bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors"
            >
              <Icon name="Warehouse" className="text-primary" size={22} />
            </Link>
            <h1 className="font-head uppercase tracking-wide text-2xl">Мой гараж</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden sm:flex items-center justify-center h-10 px-4 rounded-sm border border-steel text-muted-foreground text-sm font-head uppercase tracking-wide hover:border-primary/60 hover:text-foreground transition-colors"
            >
              <Icon name="ArrowLeft" size={16} className="mr-2" />
              На главную
            </Link>
            <Button onClick={() => open(undefined, undefined, phone, knownName, vinHistory, city)} className="font-head uppercase tracking-wide">
              <Icon name="Plus" size={16} className="mr-2" />
              Новая заявка
            </Button>
            <Button variant="secondary" onClick={logout} className="font-head uppercase tracking-wide">
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 text-muted-foreground text-sm hover:text-primary transition-colors mb-6">
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

        {orders.length > 0 && (
          <div className="mb-8 mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-steel rounded-sm p-6">
              <span className="text-muted-foreground text-xs uppercase tracking-[0.12em]">
                Заказов
              </span>
              <div className="font-head text-3xl mt-1">{orders.length}</div>
            </div>
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
          <div className="flex flex-col gap-4 mt-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-card border border-steel rounded-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-head tracking-[0.1em] text-lg">
                    {o.vin || 'VIN не указан (по фото)'}
                  </span>
                  <span className="text-muted-foreground text-xs">{formatDate(o.created_at)}</span>
                </div>
                {o.vin && (
                  <div className="flex items-center gap-2 mb-4">
                    <Input
                      value={carNameDrafts[o.id] ?? ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCarNameDrafts((d) => ({ ...d, [o.id]: value }));
                      }}
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
                  <div className="flex justify-between sm:block">
                    <span className="text-muted-foreground">Запчасти: </span>
                    <span>{o.parts || '—'}</span>
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
      </div>
    </div>
  );
};

const Garage = () => (
  <RequestProvider>
    <GarageContent />
  </RequestProvider>
);

export default Garage;