import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Icon from '@/components/ui/icon';
import { cabApi, Client, money, fmtDate, orderStatuses, statusColor } from './api';

type History = {
  orders: { id: number; status: string; total_sale: string; created_at: string }[];
  leads: { id: number; status: string; order_amount: number | null; parts: string | null; created_at: string }[];
};

const leadStatus: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена' };

const empty = { id: 0, full_name: '', phone: '', car: '', notes: '' };

const ClientsTab = ({ url }: { url: string }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [hist, setHist] = useState<History | null>(null);

  const load = useCallback(async () => {
    const d = await cabApi<{ clients: Client[] }>(url, 'clients_list');
    setClients(d.clients);
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await cabApi(url, 'client_save', form);
      setForm(empty);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const remove = async (id: number) => {
    await cabApi(url, 'client_delete', { id });
    load();
  };

  const toggle = async (id: number) => {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setHist(null);
    try {
      setHist(await cabApi<History>(url, 'client_history', { id }));
    } catch {
      setHist({ orders: [], leads: [] });
    }
  };

  const shown = clients.filter((c) => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search));

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={save} className="flex flex-col gap-2 border border-border rounded-sm p-4 h-fit">
        <h2 className="font-head uppercase tracking-wide text-lg">{form.id ? 'Изменить клиента' : 'Создать клиента'}</h2>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="ФИО *" />
        <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Телефон" />
        <Input value={form.car || ''} onChange={(e) => setForm({ ...form, car: e.target.value })} placeholder="Авто, например Toyota Camry 2014" />
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Заметки" rows={3} />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">Сохранить</Button>
          {form.id > 0 && (
            <Button type="button" variant="outline" onClick={() => setForm(empty)}>
              Отмена
            </Button>
          )}
        </div>
      </form>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-head uppercase tracking-wide text-lg">Клиенты ({clients.length})</h2>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по ФИО или телефону" className="max-w-xs" />
        </div>
        {shown.length === 0 ? (
          <p className="text-muted-foreground">Пока пусто</p>
        ) : (
          <div className="border border-border rounded-sm divide-y divide-border">
            {shown.map((c) => (
              <Fragment key={c.id}>
                <div className="flex items-start justify-between gap-3 p-3 text-sm">
                  <button type="button" onClick={() => toggle(c.id)} className="text-left flex-1">
                    <div className="font-medium flex items-center gap-1.5">
                      <Icon name={openId === c.id ? 'ChevronDown' : 'ChevronRight'} size={14} />
                      {c.full_name}
                    </div>
                    <div className="text-muted-foreground">{[c.phone, c.car].filter(Boolean).join(' · ')}</div>
                    {c.notes && <div className="text-xs text-muted-foreground mt-1">{c.notes}</div>}
                  </button>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setForm({ id: c.id, full_name: c.full_name, phone: c.phone || '', car: c.car || '', notes: c.notes || '' })}>
                      <Icon name="Pencil" size={14} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => remove(c.id)}>
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </div>
                {openId === c.id && (
                  <div className="p-3 bg-muted/20 grid gap-4 md:grid-cols-2 text-sm">
                    {!hist ? (
                      <span className="text-muted-foreground">Загрузка...</span>
                    ) : (
                      <>
                        <div>
                          <div className="font-head uppercase text-xs mb-1.5">Заказы ({hist.orders.length}) на {money(hist.orders.filter((o) => o.status !== 'cancelled').reduce((a, o) => a + Number(o.total_sale), 0))}</div>
                          {hist.orders.length === 0 && <div className="text-muted-foreground">Заказов нет</div>}
                          {hist.orders.map((o) => (
                            <div key={o.id} className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0">
                              <span>
                                № {o.id} <span className="text-xs text-muted-foreground">{fmtDate(o.created_at)}</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="whitespace-nowrap">{money(o.total_sale)}</span>
                                <span className={`text-xs border rounded-sm px-1.5 py-0.5 whitespace-nowrap ${statusColor[o.status]}`}>{orderStatuses[o.status]}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="font-head uppercase text-xs mb-1.5">Заявки ({hist.leads.length})</div>
                          {hist.leads.length === 0 && <div className="text-muted-foreground">Заявок нет</div>}
                          {hist.leads.map((l) => (
                            <div key={l.id} className="flex items-center justify-between gap-2 py-1 border-b border-border last:border-0">
                              <span className="min-w-0">
                                № {l.id} <span className="text-xs text-muted-foreground">{fmtDate(l.created_at)}</span>
                                <div className="text-xs text-muted-foreground truncate max-w-[220px]">{l.parts}</div>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="whitespace-nowrap">{l.order_amount != null ? money(l.order_amount) : '—'}</span>
                                <span className="text-xs border border-border rounded-sm px-1.5 py-0.5 whitespace-nowrap">{leadStatus[l.status] || l.status}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientsTab;
