import { Fragment, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cabApi, money, fmtDate } from './api';

type Lead = {
  id: number;
  name: string;
  phone: string;
  vin: string | null;
  car_name: string | null;
  parts: string | null;
  city: string | null;
  messenger: string | null;
  status: string;
  order_amount: number | null;
  prepayment: number | null;
  remaining: number | null;
  handled_by: string | null;
  internal_note: string | null;
  ai_articles: string | null;
  created_at: string;
};

const statusText: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Выполнена' };
const statusCls: Record<string, string> = {
  new: 'text-primary border-primary/60',
  in_progress: 'text-amber-500 border-amber-500/60',
  done: 'text-emerald-500 border-emerald-500/60',
};

const LeadsTab = ({ url, onSearch }: { url: string; onSearch: (q: string) => void }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (q = '', arch = false) => {
      setLoading(true);
      try {
        const d = await cabApi<{ leads: Lead[] }>(url, 'leads_list', { query: q, archived: arch });
        setLeads(d.leads);
      } finally {
        setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    load('', archived);
  }, [load, archived]);

  const articles = (l: Lead) =>
    Array.from(new Set((l.ai_articles?.match(/[A-Za-z0-9][A-Za-z0-9\-./]{4,}/g) || []).filter((a) => /\d/.test(a)))).slice(0, 12);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Заявки</h2>
        <p className="text-sm text-muted-foreground">Заявки с сайта дублируются сюда автоматически. Менять статусы и суммы можно в админке заявок.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(query, archived);
          }}
          className="flex gap-2 max-w-xl flex-1"
        >
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="№, имя, телефон, VIN, авто, запчасти, город" />
          <Button type="submit">
            <Icon name="Search" size={14} />
          </Button>
        </form>
        <Button size="sm" variant={archived ? 'default' : 'outline'} onClick={() => setArchived((v) => !v)}>
          Архив
        </Button>
        <Button size="sm" variant="outline" onClick={() => load(query, archived)}>
          <Icon name="RefreshCw" size={14} />
        </Button>
      </div>
      {loading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : leads.length === 0 ? (
        <p className="text-muted-foreground">Заявок нет.</p>
      ) : (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">№</th>
                <th className="text-left p-2">Дата</th>
                <th className="text-left p-2">Клиент</th>
                <th className="text-left p-2">Авто / VIN</th>
                <th className="text-left p-2">Запчасти</th>
                <th className="text-right p-2">Сумма</th>
                <th className="text-left p-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <Fragment key={l.id}>
                  <tr onClick={() => setOpen(open === l.id ? null : l.id)} className="border-t border-border cursor-pointer hover:bg-muted/30">
                    <td className="p-2 font-medium">{l.id}</td>
                    <td className="p-2 whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    <td className="p-2">
                      <div>{l.name}</div>
                      <div className="text-xs text-muted-foreground">{l.phone}</div>
                    </td>
                    <td className="p-2">
                      <div>{l.car_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{l.vin}</div>
                    </td>
                    <td className="p-2 max-w-[260px] truncate">{l.parts || '—'}</td>
                    <td className="p-2 text-right whitespace-nowrap">{l.order_amount != null ? money(l.order_amount) : '—'}</td>
                    <td className="p-2">
                      <span className={`text-xs border rounded-sm px-2 py-0.5 whitespace-nowrap ${statusCls[l.status] || ''}`}>{statusText[l.status] || l.status}</span>
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr key={`${l.id}-d`} className="border-t border-border bg-muted/20">
                      <td colSpan={7} className="p-3 text-sm flex flex-col gap-2">
                        {l.parts && <div>Запчасти: {l.parts}</div>}
                        {[l.city, l.messenger, l.handled_by].some(Boolean) && (
                          <div className="text-muted-foreground">{[l.city, l.messenger, l.handled_by && `менеджер: ${l.handled_by}`].filter(Boolean).join(' · ')}</div>
                        )}
                        {(l.prepayment != null || l.remaining != null) && (
                          <div className="text-muted-foreground">
                            Предоплата: {money(l.prepayment)} · Остаток: {money(l.remaining)}
                          </div>
                        )}
                        {l.internal_note && <div className="text-muted-foreground">Заметка: {l.internal_note}</div>}
                        {l.ai_articles && <pre className="whitespace-pre-wrap font-sans text-xs border border-border rounded-sm p-2">{l.ai_articles}</pre>}
                        {articles(l).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {articles(l).map((a) => (
                              <Button key={a} size="sm" variant="outline" onClick={() => onSearch(a)}>
                                Цены: {a}
                              </Button>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeadsTab;
