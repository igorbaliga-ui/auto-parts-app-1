import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import Icon from '@/components/ui/icon';

const LEADS_ADMIN_URL = 'https://functions.poehali.dev/68ca5544-c377-4c79-ba1f-57ba286b33a9';
const LEADS_UPDATE_URL = 'https://functions.poehali.dev/1612bdca-502b-46a9-b0ea-8d6d93876dc6';

type Lead = {
  id: number;
  vin: string | null;
  name: string;
  phone: string;
  parts: string | null;
  messenger: string | null;
  photo_url: string | null;
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

const Admin = () => {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async (pwd: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(LEADS_ADMIN_URL, {
        headers: { 'X-Admin-Password': pwd },
      });
      if (res.status === 401) {
        setError('Неверный пароль');
        setAuthed(false);
        return;
      }
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      const list: Lead[] = data.leads || [];
      setLeads(list);
      setDrafts(
        Object.fromEntries(
          list.map((l) => [
            l.id,
            { amount: l.order_amount != null ? String(l.order_amount) : '' },
          ]),
        ),
      );
      setAuthed(true);
      sessionStorage.setItem('admin_password', pwd);
    } catch {
      setError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_password');
    if (saved) {
      setPassword(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    load(password);
  };

  const setDraft = (id: number, value: string) => {
    setDrafts((d) => ({ ...d, [id]: { amount: value } }));
  };

  const saveLead = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const amount = draft.amount ? Number(draft.amount) : null;
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, order_amount: amount }),
      });
      if (!res.ok) throw new Error('request failed');
      const cashback = amount != null ? Math.round(amount * 0.03 * 100) / 100 : null;
      setLeads((ls) =>
        ls.map((l) => (l.id === id ? { ...l, order_amount: amount, cashback } : l)),
      );
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5">
        <form
          onSubmit={submit}
          className="w-full max-w-[360px] bg-card border border-steel rounded-sm p-8 flex flex-col gap-4"
        >
          <h1 className="font-head uppercase tracking-wide text-xl text-center">
            Заявки — вход
          </h1>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            autoFocus
          />
          {error && <p className="text-primary text-sm text-center">{error}</p>}
          <Button type="submit" disabled={loading} className="font-head uppercase tracking-wide h-11">
            {loading ? 'Входим…' : 'Войти'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-head uppercase tracking-wide text-2xl">
            Заявки ({leads.length})
          </h1>
          <Button
            variant="secondary"
            onClick={() => load(password)}
            disabled={loading}
            className="font-head uppercase tracking-wide"
          >
            <Icon name="RefreshCw" size={16} className="mr-2" />
            Обновить
          </Button>
        </div>

        {leads.length === 0 ? (
          <p className="text-muted-foreground">Пока нет заявок.</p>
        ) : (
          <div className="bg-card border border-steel rounded-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead>Авто</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Город</TableHead>
                  <TableHead>Мессенджер</TableHead>
                  <TableHead>Запчасти</TableHead>
                  <TableHead>Фото СТС</TableHead>
                  <TableHead>Сумма заказа</TableHead>
                  <TableHead>Кэшбэк 3%</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                      {formatDate(l.created_at)}
                    </TableCell>
                    <TableCell className="font-head tracking-[0.1em]">{l.vin || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{l.car_name || '—'}</TableCell>
                    <TableCell>{l.name}</TableCell>
                    <TableCell>
                      <a href={`tel:${l.phone}`} className="hover:text-primary">
                        {l.phone}
                      </a>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.city || '—'}</TableCell>
                    <TableCell>
                      {l.messenger ? messengerLabel[l.messenger] ?? l.messenger : '—'}
                    </TableCell>
                    <TableCell className="max-w-[240px] text-muted-foreground">
                      {l.parts || '—'}
                    </TableCell>
                    <TableCell>
                      {l.photo_url ? (
                        <a href={l.photo_url} target="_blank" rel="noreferrer">
                          <img
                            src={l.photo_url}
                            alt="Фото СТС"
                            className="h-12 w-12 object-cover rounded-sm border border-steel hover:border-primary transition-colors"
                          />
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={drafts[l.id]?.amount ?? ''}
                        onChange={(e) => setDraft(l.id, e.target.value)}
                        placeholder="0"
                        className="w-28 h-9"
                      />
                    </TableCell>
                    <TableCell className="text-primary whitespace-nowrap">
                      {l.cashback != null ? `${l.cashback} ₽` : '—'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => saveLead(l.id)}
                        disabled={savingId === l.id}
                        className="font-head uppercase tracking-wide text-xs h-9"
                      >
                        {savingId === l.id ? '…' : 'Сохранить'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;