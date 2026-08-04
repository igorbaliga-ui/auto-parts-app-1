import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { RequestProvider, useRequest } from '@/components/site/RequestDialog';

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';
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

  const load = async (ph: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(ph)}`);
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setOrders(data.orders || []);
      setAuthed(true);
      localStorage.setItem(STORAGE_KEY, ph);
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
  };

  const totalCashback = orders.reduce((sum, o) => sum + (o.cashback || 0), 0);

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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-sm bg-primary/15 flex items-center justify-center">
              <Icon name="Warehouse" className="text-primary" size={22} />
            </span>
            <h1 className="font-head uppercase tracking-wide text-2xl">Мой гараж</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => open(undefined, undefined, phone)} className="font-head uppercase tracking-wide">
              <Icon name="Plus" size={16} className="mr-2" />
              Новая заявка
            </Button>
            <Button variant="secondary" onClick={logout} className="font-head uppercase tracking-wide">
              <Icon name="LogOut" size={16} />
            </Button>
          </div>
        </div>

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
            <Button onClick={() => open(undefined, undefined, phone)} className="font-head uppercase tracking-wide">
              <Icon name="Plus" size={16} className="mr-2" />
              Оставить заявку
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-card border border-steel rounded-sm p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="font-head tracking-[0.1em] text-lg">{o.vin || 'VIN не указан (по фото)'}</span>
                  <span className="text-muted-foreground text-xs">{formatDate(o.created_at)}</span>
                </div>
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