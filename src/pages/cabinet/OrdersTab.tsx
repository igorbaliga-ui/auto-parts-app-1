import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cabApi, money, fmtDate, orderStatuses, statusColor } from './api';
import { OrderFull, printOrderDoc } from './printDoc';

type Order = {
  id: number;
  client_name: string | null;
  client_phone: string | null;
  car: string | null;
  status: string;
  total_sale: string;
  total_buy: string;
  created_at: string;
  items_count: number;
};

const OrdersTab = ({ url }: { url: string }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<OrderFull | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);

  const load = useCallback(
    async (q = '') => {
      const d = await cabApi<{ orders: Order[] }>(url, 'orders_list', { query: q });
      setOrders(d.orders);
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);

  const view = async (id: number) => {
    const d = await cabApi<{ order: OrderFull }>(url, 'order_get', { id });
    setOpen(d.order);
  };

  const setStatus = async (id: number, status: string) => {
    await cabApi(url, 'order_status', { id, status });
    setOrders((arr) => arr.map((o) => (o.id === id ? { ...o, status } : o)));
    setOpen((o) => (o && o.id === id ? { ...o, status } : o));
  };

  const doc = (kind: 'invoice' | 'waybill') => {
    if (open) setPopupBlocked(!printOrderDoc(open, kind));
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-head uppercase tracking-wide text-xl">Заказы</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query);
        }}
        className="flex gap-2 max-w-2xl"
      >
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="№ заказа, клиент, телефон, авто, артикул, бренд, поставщик" />
        <Button type="submit">
          <Icon name="Search" size={14} />
        </Button>
      </form>
      {orders.length === 0 ? (
        <p className="text-muted-foreground">Пока заказов нет.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">№</th>
                <th className="text-left p-2">Дата</th>
                <th className="text-left p-2">Клиент</th>
                <th className="text-left p-2">Авто</th>
                <th className="text-right p-2">Поз.</th>
                <th className="text-right p-2">Сумма</th>
                <th className="text-right p-2">Маржа</th>
                <th className="text-left p-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => view(o.id)} className="border-t border-border cursor-pointer hover:bg-muted/30">
                  <td className="p-2 font-medium">{o.id}</td>
                  <td className="p-2 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                  <td className="p-2">
                    <div>{o.client_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{o.client_phone}</div>
                  </td>
                  <td className="p-2">{o.car || '—'}</td>
                  <td className="p-2 text-right">{o.items_count}</td>
                  <td className="p-2 text-right whitespace-nowrap">{money(o.total_sale)}</td>
                  <td className="p-2 text-right whitespace-nowrap text-muted-foreground">{money(Number(o.total_sale) - Number(o.total_buy))}</td>
                  <td className="p-2">
                    <span className={`text-xs border rounded-sm px-2 py-0.5 whitespace-nowrap ${statusColor[o.status]}`}>{orderStatuses[o.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Заказ № {open.id} от {fmtDate(open.created_at)}
                </DialogTitle>
              </DialogHeader>
              <div className="text-sm flex flex-col gap-1">
                <div>
                  Клиент: {open.client_name || '—'} {open.client_phone}
                </div>
                {open.car && <div>Авто: {open.car}</div>}
                {open.comment && <div>Комментарий: {open.comment}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={open.status} onChange={(e) => setStatus(open.id, e.target.value)} className="h-9 rounded-sm border border-input bg-background px-2 text-sm">
                  {Object.entries(orderStatuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={() => doc('invoice')}>
                  <Icon name="FileText" size={14} className="mr-1.5" />
                  Счёт
                </Button>
                <Button size="sm" variant="outline" onClick={() => doc('waybill')}>
                  <Icon name="FileCheck" size={14} className="mr-1.5" />
                  Накладная
                </Button>
                {popupBlocked && <span className="text-xs text-destructive">Разрешите всплывающие окна в браузере</span>}
              </div>
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Артикул</th>
                    <th className="text-left p-2">Наименование</th>
                    <th className="text-right p-2">Кол-во</th>
                    <th className="text-right p-2">Цена</th>
                    <th className="text-right p-2">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {open.items.map((i) => (
                    <tr key={i.id} className="border-t border-border">
                      <td className="p-2">
                        {i.article} <span className="text-xs text-muted-foreground">{i.brand}</span>
                      </td>
                      <td className="p-2">{i.name}</td>
                      <td className="p-2 text-right">{i.qty}</td>
                      <td className="p-2 text-right whitespace-nowrap">{money(i.price_sale)}</td>
                      <td className="p-2 text-right whitespace-nowrap">{money(Number(i.price_sale) * i.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-medium">Итого: {money(open.total_sale)}</div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrdersTab;
