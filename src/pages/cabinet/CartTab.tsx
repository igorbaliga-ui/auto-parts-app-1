import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { cabApi, money, CartItem, Client } from './api';

type Props = { url: string; onChanged: () => void; onOrdered: () => void };

const CartTab = ({ url, onChanged, onOrdered }: Props) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sel, setSel] = useState<number[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [car, setCar] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, cl] = await Promise.all([
      cabApi<{ items: CartItem[] }>(url, 'cart_list'),
      cabApi<{ clients: Client[] }>(url, 'clients_list'),
    ]);
    setItems(c.items);
    setClients(cl.clients);
    setSel((p) => p.filter((id) => c.items.some((i) => i.id === id)));
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: number, p: Partial<CartItem>) => setItems((arr) => arr.map((i) => (i.id === id ? { ...i, ...p } : i)));

  const save = async (i: CartItem) => {
    await cabApi(url, 'cart_update', { id: i.id, qty: i.qty, price_sale: i.price_sale, note: i.note });
  };

  const remove = async () => {
    await cabApi(url, 'cart_delete', { ids: sel });
    setSel([]);
    await load();
    onChanged();
  };

  const chosen = items.filter((i) => sel.includes(i.id));
  const total = chosen.reduce((a, i) => a + Number(i.price_sale) * i.qty, 0);
  const profit = chosen.reduce((a, i) => a + (Number(i.price_sale) - Number(i.price_buy)) * i.qty, 0);

  const order = async () => {
    setBusy(true);
    setError('');
    try {
      await cabApi(url, 'order_create', { ids: sel, client_id: clientId ? Number(clientId) : null, client_name: clientName, client_phone: clientPhone, car, comment });
      setSel([]);
      setComment('');
      await load();
      onChanged();
      onOrdered();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-head uppercase tracking-wide text-xl">Корзина</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Корзина пуста. Найдите запчасти в разделе «Поиск».</p>
      ) : (
        <>
          <div className="overflow-x-auto border border-border rounded-sm">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2 w-8">
                    <Checkbox checked={sel.length === items.length} onCheckedChange={(v) => setSel(v === true ? items.map((i) => i.id) : [])} />
                  </th>
                  <th className="text-left p-2">Артикул / бренд</th>
                  <th className="text-left p-2">Наименование</th>
                  <th className="text-left p-2">Поставщик</th>
                  <th className="text-right p-2">Срок</th>
                  <th className="text-right p-2">Закупка</th>
                  <th className="text-right p-2">Продажа</th>
                  <th className="text-right p-2">Кол-во</th>
                  <th className="text-right p-2">Сумма</th>
                  <th className="text-left p-2">Примечание</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-t border-border">
                    <td className="p-2">
                      <Checkbox checked={sel.includes(i.id)} onCheckedChange={(v) => setSel((p) => (v === true ? [...p, i.id] : p.filter((x) => x !== i.id)))} />
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <div className="font-medium">{i.article}</div>
                      <div className="text-xs text-muted-foreground">{i.brand}</div>
                    </td>
                    <td className="p-2 max-w-[220px]">{i.name}</td>
                    <td className="p-2">{i.supplier_name}</td>
                    <td className="p-2 text-right whitespace-nowrap">{i.delivery_days != null ? `${i.delivery_days} дн.` : '—'}</td>
                    <td className="p-2 text-right whitespace-nowrap text-muted-foreground">{money(i.price_buy)}</td>
                    <td className="p-2 text-right">
                      <Input type="number" value={i.price_sale} onChange={(e) => patch(i.id, { price_sale: e.target.value })} onBlur={() => save(i)} className="w-28 h-8 text-right ml-auto" />
                    </td>
                    <td className="p-2 text-right">
                      <Input type="number" min={1} value={i.qty} onChange={(e) => patch(i.id, { qty: Math.max(1, Number(e.target.value) || 1) })} onBlur={() => save(i)} className="w-16 h-8 text-right ml-auto" />
                    </td>
                    <td className="p-2 text-right whitespace-nowrap font-medium">{money(Number(i.price_sale) * i.qty)}</td>
                    <td className="p-2">
                      <Input value={i.note || ''} onChange={(e) => patch(i.id, { note: e.target.value })} onBlur={() => save(i)} className="w-36 h-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:grid-cols-2 border border-border rounded-sm p-4">
            <div className="flex flex-col gap-2">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 rounded-sm border border-input bg-background px-3 text-sm">
                <option value="">Клиент не выбран</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.phone || ''}
                  </option>
                ))}
              </select>
              {!clientId && (
                <>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Имя клиента (если нет в списке)" />
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Телефон" />
                </>
              )}
              <Input value={car} onChange={(e) => setCar(e.target.value)} placeholder="Авто (необязательно)" />
            </div>
            <div className="flex flex-col gap-2">
              <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Комментарий к заказу" rows={3} />
              <div className="text-sm">
                Выбрано: {chosen.length} поз. на <b>{money(total)}</b>
                <span className="text-muted-foreground"> (маржа {money(profit)})</span>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button disabled={!sel.length || busy} onClick={order}>
                  <Icon name="Send" size={14} className="mr-1.5" />
                  Оформить заказ ({sel.length})
                </Button>
                <Button variant="outline" disabled={!sel.length} onClick={remove}>
                  <Icon name="Trash2" size={14} className="mr-1.5" />
                  Удалить выбранные
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CartTab;
