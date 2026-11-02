import { safeGetSession } from '@/lib/storage';


export const cabApi = async <T = Record<string, unknown>>(url: string, action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': safeGetSession('admin_password') || '' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data as T;
};

export const money = (v: number | string | null | undefined) =>
  `${Number(v || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;

export const fmtDate = (s: string) => {
  const d = new Date(s.endsWith('Z') ? s : `${s}Z`);
  return isNaN(d.getTime()) ? s : d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
};

export type Item = {
  id: number;
  supplier_id: number;
  supplier_name: string;
  article: string;
  brand: string;
  name: string;
  price: number;
  sale: number;
  qty: number;
  delivery_days: number | null;
  warehouse: string;
  berg_resource_id?: string;
  berg_warehouse_id?: string;
};

export type CartItem = {
  id: number;
  article: string;
  brand: string;
  name: string;
  supplier_name: string;
  delivery_days: number | null;
  price_buy: string;
  price_sale: string;
  qty: number;
  note: string | null;
};

export type Client = { id: number; full_name: string; phone: string | null; car: string | null; notes: string | null };

export const orderStatuses: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  ordered: 'Заказан у поставщика',
  shipped: 'В пути',
  done: 'Выполнен',
  cancelled: 'Отменён',
};

export const statusColor: Record<string, string> = {
  new: 'text-primary border-primary/60',
  confirmed: 'text-sky-500 border-sky-500/60',
  ordered: 'text-amber-500 border-amber-500/60',
  shipped: 'text-violet-500 border-violet-500/60',
  done: 'text-emerald-500 border-emerald-500/60',
  cancelled: 'text-muted-foreground border-border',
};
