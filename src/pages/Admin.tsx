import { useEffect, useMemo, useState } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Icon from '@/components/ui/icon';
import PageBackground from '@/components/site/PageBackground';

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
  status: 'in_progress' | 'done';
};

const messengerLabel: Record<string, string> = {
  telegram: 'Telegram',
  max: 'MAX',
  whatsapp: 'WhatsApp',
};

const statusLabel: Record<Lead['status'], string> = {
  in_progress: 'В работе',
  done: 'Выполнен',
};

type ColumnSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
};

const ColumnSearchInput = ({ value, onChange, suggestions }: ColumnSearchInputProps) => {
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(query)).slice(0, 6);
  }, [value, suggestions]);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Поиск…"
        autoComplete="off"
        className="h-8 text-xs font-normal normal-case tracking-normal bg-background"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-w-[220px] bg-popover border border-border rounded-sm shadow-md overflow-hidden">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 text-xs font-normal normal-case tracking-normal text-foreground hover:bg-accent transition-colors truncate"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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

type ColumnKey =
  | 'date'
  | 'vin'
  | 'car'
  | 'name'
  | 'phone'
  | 'city'
  | 'messenger'
  | 'parts'
  | 'photo'
  | 'amount'
  | 'cashback'
  | 'status';

type ColumnDef = {
  key: ColumnKey;
  label: string;
  searchable: boolean;
  getSearchValue?: (l: Lead) => string;
};

const columns: ColumnDef[] = [
  { key: 'date', label: 'Дата', searchable: true, getSearchValue: (l) => formatDate(l.created_at) },
  { key: 'vin', label: 'VIN', searchable: true, getSearchValue: (l) => l.vin || '' },
  { key: 'car', label: 'Авто', searchable: true, getSearchValue: (l) => l.car_name || '' },
  { key: 'name', label: 'Имя', searchable: true, getSearchValue: (l) => l.name || '' },
  { key: 'phone', label: 'Телефон', searchable: true, getSearchValue: (l) => l.phone || '' },
  { key: 'city', label: 'Город', searchable: true, getSearchValue: (l) => l.city || '' },
  {
    key: 'messenger',
    label: 'Мессенджер',
    searchable: true,
    getSearchValue: (l) => (l.messenger ? messengerLabel[l.messenger] ?? l.messenger : ''),
  },
  { key: 'parts', label: 'Запчасти', searchable: true, getSearchValue: (l) => l.parts || '' },
  { key: 'photo', label: 'Фото СТС', searchable: false },
  { key: 'amount', label: 'Сумма заказа', searchable: false },
  { key: 'cashback', label: 'Кэшбэк 3%', searchable: false },
  {
    key: 'status',
    label: 'Статус',
    searchable: true,
    getSearchValue: (l) => statusLabel[l.status],
  },
];

const Admin = () => {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { amount: string }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnKey, string>>>({});

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
      const lead = leads.find((l) => l.id === id);
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, order_amount: amount, status: lead?.status }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setLeads((ls) =>
        ls.map((l) => (l.id === id ? { ...l, order_amount: amount, cashback: data.cashback ?? null } : l)),
      );
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextStatus = lead.status === 'done' ? 'in_progress' : 'done';
    setSavingId(id);
    try {
      const amount = drafts[id]?.amount ? Number(drafts[id].amount) : lead.order_amount;
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, order_amount: amount, status: nextStatus }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status: nextStatus } : l)));
    } catch {
      setError('Не удалось изменить статус. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  const isColumnVisible = (key: ColumnKey) => !hiddenColumns.has(key);

  const toggleColumn = (key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setColumnFilter = (key: ColumnKey, value: string) => {
    setColumnFilters((f) => ({ ...f, [key]: value }));
  };

  // Уникальные значения по каждому столбцу — подсказки для datalist по мере ввода
  const suggestionsByColumn = useMemo(() => {
    const map = {} as Record<ColumnKey, string[]>;
    columns.forEach((col) => {
      if (!col.searchable || !col.getSearchValue) return;
      const values = new Set<string>();
      leads.forEach((l) => {
        const v = col.getSearchValue!(l);
        if (v) values.add(v);
      });
      map[col.key] = Array.from(values).sort();
    });
    return map;
  }, [leads]);

  const filteredLeads = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v && v.trim());
    if (activeFilters.length === 0) return leads;
    return leads.filter((l) =>
      activeFilters.every(([key, value]) => {
        const col = columns.find((c) => c.key === key);
        if (!col?.getSearchValue) return true;
        return col.getSearchValue(l).toLowerCase().includes(value.trim().toLowerCase());
      }),
    );
  }, [leads, columnFilters]);

  const hasActiveFilters = Object.values(columnFilters).some((v) => v && v.trim());

  const clearFilters = () => setColumnFilters({});

  if (!authed) {
    return (
      <PageBackground>
        <div className="min-h-screen flex items-center justify-center px-5">
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
      </PageBackground>
    );
  }

  return (
    <PageBackground>
    <div className="min-h-screen text-foreground px-5 sm:px-8 lg:px-12 py-10">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="font-head uppercase tracking-wide text-2xl">
            Заявки ({filteredLeads.length}{filteredLeads.length !== leads.length ? ` из ${leads.length}` : ''})
          </h1>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="font-head uppercase tracking-wide text-muted-foreground"
              >
                <Icon name="X" size={16} className="mr-2" />
                Сбросить фильтры
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" className="font-head uppercase tracking-wide">
                  <Icon name="Columns3" size={16} className="mr-2" />
                  Столбцы
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Показывать столбцы</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={isColumnVisible(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
        </div>

        {leads.length === 0 ? (
          <p className="text-muted-foreground">Пока нет заявок.</p>
        ) : (
          <div className="bg-card border border-steel rounded-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map(
                    (col) =>
                      isColumnVisible(col.key) && <TableHead key={col.key}>{col.label}</TableHead>,
                  )}
                  <TableHead />
                </TableRow>
                <TableRow>
                  {columns.map((col) => {
                    if (!isColumnVisible(col.key)) return null;
                    if (!col.searchable) return <TableHead key={col.key} />;
                    return (
                      <TableHead key={col.key} className="py-2">
                        <ColumnSearchInput
                          value={columnFilters[col.key] ?? ''}
                          onChange={(v) => setColumnFilter(col.key, v)}
                          suggestions={suggestionsByColumn[col.key] || []}
                        />
                      </TableHead>
                    );
                  })}
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((l) => (
                  <TableRow key={l.id}>
                    {isColumnVisible('date') && (
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {formatDate(l.created_at)}
                      </TableCell>
                    )}
                    {isColumnVisible('vin') && (
                      <TableCell className="font-head tracking-[0.1em]">{l.vin || '—'}</TableCell>
                    )}
                    {isColumnVisible('car') && (
                      <TableCell className="text-muted-foreground">{l.car_name || '—'}</TableCell>
                    )}
                    {isColumnVisible('name') && <TableCell>{l.name}</TableCell>}
                    {isColumnVisible('phone') && (
                      <TableCell>
                        <a href={`tel:${l.phone}`} className="hover:text-primary">
                          {l.phone}
                        </a>
                      </TableCell>
                    )}
                    {isColumnVisible('city') && (
                      <TableCell className="text-muted-foreground">{l.city || '—'}</TableCell>
                    )}
                    {isColumnVisible('messenger') && (
                      <TableCell>
                        {l.messenger ? messengerLabel[l.messenger] ?? l.messenger : '—'}
                      </TableCell>
                    )}
                    {isColumnVisible('parts') && (
                      <TableCell className="max-w-[240px] text-muted-foreground">
                        {l.parts || '—'}
                      </TableCell>
                    )}
                    {isColumnVisible('photo') && (
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
                    )}
                    {isColumnVisible('amount') && (
                      <TableCell>
                        <Input
                          type="number"
                          value={drafts[l.id]?.amount ?? ''}
                          onChange={(e) => setDraft(l.id, e.target.value)}
                          placeholder="0"
                          className="w-28 h-9"
                        />
                      </TableCell>
                    )}
                    {isColumnVisible('cashback') && (
                      <TableCell className="text-primary whitespace-nowrap">
                        {l.cashback != null ? `${l.cashback} ₽` : '—'}
                      </TableCell>
                    )}
                    {isColumnVisible('status') && (
                      <TableCell>
                        <button
                          onClick={() => toggleStatus(l.id)}
                          disabled={savingId === l.id}
                          className={`whitespace-nowrap text-[0.65rem] font-head uppercase tracking-wide px-2 py-1.5 rounded-sm transition-colors ${
                            l.status === 'done'
                              ? 'bg-primary/15 text-primary hover:bg-primary/25'
                              : 'bg-muted text-muted-foreground hover:bg-muted/70'
                          }`}
                        >
                          {statusLabel[l.status]}
                        </button>
                      </TableCell>
                    )}
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
                {filteredLeads.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-8">
                      Ничего не найдено по заданным фильтрам.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
    </PageBackground>
  );
};

export default Admin;