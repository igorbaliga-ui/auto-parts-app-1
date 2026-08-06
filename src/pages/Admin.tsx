import { useEffect, useMemo, useState } from 'react';
import PageBackground from '@/components/site/PageBackground';
import AdminLoginForm from './admin/AdminLoginForm';
import AdminLeadsTable from './admin/AdminLeadsTable';
import { Lead, ColumnKey, columns } from './admin/adminTypes';

const LEADS_ADMIN_URL = 'https://functions.poehali.dev/68ca5544-c377-4c79-ba1f-57ba286b33a9';
const LEADS_UPDATE_URL = 'https://functions.poehali.dev/1612bdca-502b-46a9-b0ea-8d6d93876dc6';
const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';

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
  const [statusTab, setStatusTab] = useState<'in_progress' | 'done' | 'all'>('in_progress');

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
      const data = await res.json();
      setLeads((ls) =>
        ls.map((l) =>
          l.id === id ? { ...l, status: nextStatus, completed_at: data.completed_at ?? null } : l,
        ),
      );
    } catch {
      setError('Не удалось изменить статус. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  const toggleArrived = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextArrived = !lead.arrived;
    setSavingId(id);
    try {
      const amount = drafts[id]?.amount ? Number(drafts[id].amount) : lead.order_amount;
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, order_amount: amount, arrived: nextArrived }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, arrived: nextArrived } : l)));
    } catch {
      setError('Не удалось изменить пометку. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  const resetGaragePassword = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setSavingId(id);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ action: 'admin_reset_password', phone: lead.phone }),
      });
      if (!res.ok) throw new Error('request failed');
    } catch {
      setError('Не удалось сбросить пароль. Попробуйте ещё раз.');
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

  const statusFilteredLeads = useMemo(() => {
    if (statusTab === 'all') return leads;
    return leads.filter((l) => l.status === statusTab);
  }, [leads, statusTab]);

  const inProgressCount = useMemo(() => leads.filter((l) => l.status === 'in_progress').length, [leads]);
  const doneCount = useMemo(() => leads.filter((l) => l.status === 'done').length, [leads]);

  const filteredLeads = useMemo(() => {
    const activeFilters = Object.entries(columnFilters).filter(([, v]) => v && v.trim());
    if (activeFilters.length === 0) return statusFilteredLeads;
    return statusFilteredLeads.filter((l) =>
      activeFilters.every(([key, value]) => {
        const col = columns.find((c) => c.key === key);
        if (!col?.getSearchValue) return true;
        return col.getSearchValue(l).toLowerCase().includes(value.trim().toLowerCase());
      }),
    );
  }, [statusFilteredLeads, columnFilters]);

  const hasActiveFilters = Object.values(columnFilters).some((v) => v && v.trim());

  const clearFilters = () => setColumnFilters({});

  if (!authed) {
    return (
      <AdminLoginForm
        password={password}
        setPassword={setPassword}
        error={error}
        loading={loading}
        onSubmit={submit}
      />
    );
  }

  return (
    <PageBackground>
      <AdminLeadsTable
        leads={leads}
        filteredLeads={filteredLeads}
        drafts={drafts}
        savingId={savingId}
        hiddenColumns={hiddenColumns}
        columnFilters={columnFilters}
        suggestionsByColumn={suggestionsByColumn}
        hasActiveFilters={hasActiveFilters}
        loading={loading}
        isColumnVisible={isColumnVisible}
        toggleColumn={toggleColumn}
        setColumnFilter={setColumnFilter}
        clearFilters={clearFilters}
        setDraft={setDraft}
        saveLead={saveLead}
        toggleStatus={toggleStatus}
        toggleArrived={toggleArrived}
        resetGaragePassword={resetGaragePassword}
        onRefresh={() => load(password)}
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        inProgressCount={inProgressCount}
        doneCount={doneCount}
      />
    </PageBackground>
  );
};

export default Admin;