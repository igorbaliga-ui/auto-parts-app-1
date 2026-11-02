import { useCallback, useEffect, useState } from 'react';
import PageBackground from '@/components/site/PageBackground';
import Icon from '@/components/ui/icon';
import { safeGetSession } from '@/lib/storage';
import { cabApi, money, Client } from './api';
import SearchTab from './SearchTab';
import CartTab from './CartTab';
import OrdersTab from './OrdersTab';
import ClientsTab from './ClientsTab';
import GarageTab from './GarageTab';
import SuppliersTab from './SuppliersTab';
import MarkupsTab from './MarkupsTab';
import HistoryTab from './HistoryTab';
import BulkTab from './BulkTab';
import CrossesTab from './CrossesTab';
import PriorityTab from './PriorityTab';
import AnalyticsTab from './AnalyticsTab';
import OemTab from './OemTab';
import LeadsTab from './LeadsTab';
import SettingsTab from './SettingsTab';
import funcs from '../../../backend/func2url.json';

type Tab = 'home' | 'leads' | 'oem' | 'settings' | 'bulk' | 'crosses' | 'priority' | 'analytics' | 'search' | 'cart' | 'orders' | 'clients' | 'garage' | 'suppliers' | 'markups' | 'history';

const MENU: { key: Tab; label: string; icon: string; group?: string }[] = [
  { key: 'home', label: 'Кабинет', icon: 'LayoutDashboard' },
  { key: 'search', label: 'Поиск запчастей', icon: 'Search', group: 'Поиск' },
  { key: 'oem', label: 'Оригинальный каталог / ИИ-поиск', icon: 'BookOpen' },
  { key: 'bulk', label: 'Анализ цен', icon: 'FileSpreadsheet' },
  { key: 'history', label: 'История поиска', icon: 'History' },
  { key: 'crosses', label: 'Кроссы', icon: 'ArrowLeftRight' },
  { key: 'priority', label: 'Приоритетные бренды', icon: 'Star' },
  { key: 'leads', label: 'Заявки', icon: 'Inbox', group: 'Продажи' },
  { key: 'cart', label: 'Корзина', icon: 'ShoppingCart' },
  { key: 'orders', label: 'Заказы', icon: 'ClipboardList' },
  { key: 'clients', label: 'Клиенты', icon: 'Users' },
  { key: 'garage', label: 'Гараж', icon: 'Car' },
  { key: 'suppliers', label: 'Мои поставщики', icon: 'Truck', group: 'Поставщики' },
  { key: 'markups', label: 'Наценки', icon: 'Percent' },
  { key: 'analytics', label: 'Аналитика закупок', icon: 'ChartBar' },
  { key: 'settings', label: 'Настройки', icon: 'Settings', group: 'Настройки' },
];

type Stats = { searches: number; suppliers: number; orders: number; orders_sum: string; cart: number };

const url = (funcs as Record<string, string>)['cabinet'] || '';

const Cabinet = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [stats, setStats] = useState<Stats | null>(null);
  const [repeat, setRepeat] = useState('');
  const [orderFor, setOrderFor] = useState<Client | null>(null);

  const refresh = useCallback(async () => {
    try {
      const d = await cabApi<{ stats: Stats }>(url, 'stats');
      setStats(d.stats);
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    const has = !!safeGetSession('admin_password');
    setAuthed(has);
    if (has) refresh();
  }, [refresh]);

  if (authed === null) return null;

  if (!authed) {
    return (
      <PageBackground>
        <div className="min-h-screen flex items-center justify-center px-5">
          <div className="max-w-sm bg-card border border-steel rounded-sm p-8 text-center flex flex-col gap-3">
            <p>Сначала войдите в админку заявок, потом вернитесь сюда.</p>
            <a href="/admin" className="text-primary underline">
              Перейти в админку
            </a>
          </div>
        </div>
      </PageBackground>
    );
  }

  const go = (t: Tab) => setTab(t);

  return (
    <PageBackground>
      <div className="flex flex-col md:flex-row min-h-screen">
        <nav className="md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-steel p-3 flex md:flex-col gap-1 overflow-x-auto">
          {MENU.map((m) => (
            <div key={m.key} className="contents">
            {m.group && <div className="hidden md:block px-3 pt-3 pb-1 text-[11px] uppercase tracking-widest text-muted-foreground">{m.group}</div>}
            <button
              onClick={() => go(m.key)}
              className={`h-10 px-3 rounded-sm border text-sm font-head uppercase tracking-wide transition-colors flex items-center gap-2 whitespace-nowrap ${
                tab === m.key ? 'border-primary bg-primary/10 text-foreground' : 'border-transparent text-muted-foreground hover:border-primary/60'
              }`}
            >
              <Icon name={m.icon} size={15} />
              {m.label}
              {m.key === 'cart' && stats && stats.cart > 0 && <span className="ml-auto text-xs text-primary">{stats.cart}</span>}
            </button>
            </div>
          ))}
          <a href="/admin" className="h-10 px-3 mt-auto rounded-sm text-sm font-head uppercase tracking-wide text-muted-foreground hover:text-foreground flex items-center gap-2 whitespace-nowrap">
            <Icon name="ArrowLeft" size={15} />
            К заявкам
          </a>
        </nav>
        <main className="flex-1 p-5 sm:p-8 min-w-0">
          {tab === 'home' && (
            <div className="flex flex-col gap-4">
              <h1 className="font-head uppercase tracking-wide text-2xl">Кабинет</h1>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {[
                  ['Поисков', stats?.searches ?? 0],
                  ['Поставщиков', stats?.suppliers ?? 0],
                  ['Заказов', stats?.orders ?? 0],
                  ['Сумма заказов', money(stats?.orders_sum)],
                ].map(([l, v]) => (
                  <div key={String(l)} className="border border-border rounded-sm p-4">
                    <div className="text-xs uppercase text-muted-foreground">{l}</div>
                    <div className="text-xl font-medium mt-1">{v}</div>
                  </div>
                ))}
              </div>
              {stats && stats.cart > 0 && (
                <button onClick={() => go('cart')} className="self-start h-10 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-head uppercase tracking-wide">
                  В корзине {stats.cart} поз. — оформить заказ
                </button>
              )}
              <div className="border border-border rounded-sm p-4 max-w-xl">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Быстрый старт</div>
                {[
                  ['suppliers', 'Подключить поставщиков — прайс-листом', (stats?.suppliers ?? 0) > 0],
                  ['search', 'Найти запчасти и добавить в корзину', (stats?.searches ?? 0) > 0],
                  ['cart', 'Оформить заказ клиенту', (stats?.orders ?? 0) > 0],
                ].map(([k, l, done], n) => (
                  <button key={String(k)} onClick={() => go(k as Tab)} className="flex items-center gap-2 py-1.5 text-sm text-left hover:text-primary w-full">
                    <Icon name={done ? 'CircleCheck' : 'Circle'} size={16} className={done ? 'text-emerald-500' : 'text-muted-foreground'} />
                    {n + 1}. {String(l)}
                  </button>
                ))}
              </div>
              {stats && stats.suppliers === 0 && (
                <p className="text-sm text-muted-foreground">
                  Начните с раздела «Поставщики»: добавьте поставщика и загрузите его прайс, затем настройте наценки.
                </p>
              )}
            </div>
          )}
          {tab === 'search' && <SearchTab key={repeat} url={url} onCartChange={refresh} initialQuery={repeat} />}
          {tab === 'cart' && <CartTab url={url} onChanged={refresh} onOrdered={() => go('orders')} presetClient={orderFor} onPresetUsed={() => setOrderFor(null)} />}
          {tab === 'orders' && <OrdersTab url={url} />}
          {tab === 'clients' && <ClientsTab
              url={url}
              onCreateOrder={(c) => {
                setOrderFor(c);
                go('cart');
              }}
            />}
          {tab === 'garage' && <GarageTab url={url} />}
          {tab === 'suppliers' && <SuppliersTab url={url} />}
          {tab === 'markups' && <MarkupsTab url={url} />}
          {tab === 'leads' && (
            <LeadsTab
              url={url}
              onSearch={(q) => {
                setRepeat(q);
                go('search');
              }}
            />
          )}
          {tab === 'oem' && (
            <OemTab
              onSearch={(q) => {
                setRepeat(q);
                go('search');
              }}
            />
          )}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'bulk' && <BulkTab url={url} />}
          {tab === 'crosses' && <CrossesTab url={url} />}
          {tab === 'priority' && <PriorityTab url={url} />}
          {tab === 'analytics' && <AnalyticsTab url={url} />}
          {tab === 'history' && (
            <HistoryTab
              url={url}
              onRepeat={(q) => {
                setRepeat(q);
                go('search');
              }}
            />
          )}
        </main>
      </div>
    </PageBackground>
  );
};

export default Cabinet;
