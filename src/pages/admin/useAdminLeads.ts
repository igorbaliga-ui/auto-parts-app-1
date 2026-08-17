import { useEffect, useMemo, useState } from 'react';
import { useAdminPushSubscription } from '@/hooks/use-admin-push-subscription';
import { safeGetSession, safeSetSession, safeRemoveSession, safeGetJSON, safeSetItem, safeGetItem } from '@/lib/storage';
import { setAppBadge } from '@/lib/app-badge';
import { Lead, ColumnKey, columns } from './adminTypes';

const LEADS_ADMIN_URL = 'https://functions.poehali.dev/68ca5544-c377-4c79-ba1f-57ba286b33a9';
const LEADS_UPDATE_URL = 'https://functions.poehali.dev/1612bdca-502b-46a9-b0ea-8d6d93876dc6';
const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';
const CLIENT_NOTES_URL = 'https://functions.poehali.dev/6db08252-18b5-4e2f-8d19-e0b07150e9d5';

// Ключ для сохранения в localStorage набора скрытых столбцов таблицы заявок —
// хранится постоянно (не sessionStorage), чтобы настройка не сбрасывалась между заходами
const HIDDEN_COLUMNS_KEY = 'admin_hidden_columns';

type Draft = { amount: string; prepayment: string; note: string };

const phoneLast10 = (phone: string) => phone.replace(/\D/g, '').slice(-10);

const loadHiddenColumns = (): Set<ColumnKey> => {
  const saved = safeGetJSON<ColumnKey[]>(HIDDEN_COLUMNS_KEY);
  return saved ? new Set(saved) : new Set();
};

const STATUS_TAB_KEY = 'admin_status_tab';
type StatusTab = 'new' | 'in_progress' | 'done' | 'all' | 'archived';
const VALID_STATUS_TABS: StatusTab[] = ['new', 'in_progress', 'done', 'all', 'archived'];

const loadStatusTab = (): StatusTab => {
  const saved = safeGetItem(STATUS_TAB_KEY);
  return (VALID_STATUS_TABS as string[]).includes(saved || '') ? (saved as StatusTab) : 'new';
};

/**
 * Вся логика страницы /admin: авторизация менеджера, загрузка заявок, черновики
 * редактируемых полей (сумма/предоплата/заметка), сохранение изменений на бэкенд,
 * фильтрация/поиск по столбцам и видимость столбцов.
 * Вынесено из Admin.tsx, чтобы сам компонент страницы был только вёрсткой.
 */
export const useAdminLeads = () => {
  const [password, setPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(loadHiddenColumns);
  const [columnFilters, setColumnFilters] = useState<Partial<Record<ColumnKey, string>>>({});
  const [statusTab, setStatusTabState] = useState<StatusTab>(loadStatusTab);

  // Выбранная вкладка статуса тоже сохраняется в localStorage — при заходе снова
  // открывается тот же раздел (например «В работе»), что и в прошлый раз
  const setStatusTab = (tab: StatusTab) => {
    setStatusTabState(tab);
    safeSetItem(STATUS_TAB_KEY, tab);
  };
  const {
    permission: pushPermission,
    subscribing: pushSubscribing,
    subscribe: subscribePush,
  } = useAdminPushSubscription(authed ? password : null);

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
            {
              amount: l.order_amount != null ? String(l.order_amount) : '',
              prepayment: l.prepayment != null ? String(l.prepayment) : '',
              note: l.internal_note ?? '',
            },
          ]),
        ),
      );
      setAuthed(true);
      safeSetSession('admin_password', pwd);
    } catch {
      setError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = safeGetSession('admin_password');
    const savedName = safeGetSession('admin_name');
    if (savedName) setAdminName(savedName);
    if (saved) {
      setPassword(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Манифест для /admin уже подставлен синхронно в index.html (до загрузки React) —
  // это нужно, чтобы браузер сразу видел манифест админки при установке на главный экран.
  // Здесь только подстраховка для перехода на /admin кликом внутри SPA (без полной перезагрузки),
  // и обязательный возврат к манифесту сайта при уходе со страницы.
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    link?.setAttribute('href', '/admin-manifest.webmanifest');
    return () => {
      link?.setAttribute('href', '/manifest.webmanifest');
    };
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      setError('Введите имя');
      return;
    }
    safeSetSession('admin_name', adminName.trim());
    load(password);
  };

  const setDraft = (id: number, value: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: { amount: value, prepayment: d[id]?.prepayment ?? '', note: d[id]?.note ?? '' },
    }));
  };

  const setPrepaymentDraft = (id: number, value: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: { amount: d[id]?.amount ?? '', prepayment: value, note: d[id]?.note ?? '' },
    }));
  };

  const setNoteDraft = (id: number, value: string) => {
    setDrafts((d) => ({
      ...d,
      [id]: { amount: d[id]?.amount ?? '', prepayment: d[id]?.prepayment ?? '', note: value },
    }));
  };

  const saveLead = async (id: number) => {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      const amount = draft.amount ? Number(draft.amount) : null;
      const prepayment = draft.prepayment ? Number(draft.prepayment) : null;
      const note = draft.note.trim() ? draft.note : null;
      const lead = leads.find((l) => l.id === id);
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({
          id,
          order_amount: amount,
          prepayment,
          status: lead?.status,
          internal_note: note,
          admin_name: adminName,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setLeads((ls) =>
        ls.map((l) =>
          l.id === id
            ? {
                ...l,
                order_amount: amount,
                prepayment,
                internal_note: note,
                remaining: data.remaining ?? null,
                cashback: data.cashback ?? null,
              }
            : l,
        ),
      );
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  // Точечное сохранение одного текстового поля (VIN, имя, телефон, город, мессенджер, запчасти, авто) —
  // используется для клик-редактирования прямо в ячейке таблицы
  const saveLeadField = async (id: number, field: string, value: string) => {
    setSavingId(id);
    try {
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, [field]: value, admin_name: adminName }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, [field]: value || null } : l)));
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
      throw new Error('save failed');
    } finally {
      setSavingId(null);
    }
  };

  const toggleStatus = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    // Клик по метке статуса: «Новая»/«Выполнен» → «В работе»; «В работе» → «Выполнен»
    const nextStatus = lead.status === 'in_progress' ? 'done' : 'in_progress';
    setSavingId(id);
    try {
      const amount = drafts[id]?.amount ? Number(drafts[id].amount) : lead.order_amount;
      const prepayment = drafts[id]?.prepayment ? Number(drafts[id].prepayment) : lead.prepayment;
      const note = drafts[id]?.note.trim() ? drafts[id].note : lead.internal_note;
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({
          id,
          order_amount: amount,
          prepayment,
          status: nextStatus,
          internal_note: note,
          admin_name: adminName,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      const data = await res.json();
      setLeads((ls) =>
        ls.map((l) =>
          l.id === id
            ? {
                ...l,
                status: nextStatus,
                remaining: data.remaining ?? null,
                completed_at: data.completed_at ?? null,
                handled_by: data.handled_by ?? l.handled_by,
              }
            : l,
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
      const prepayment = drafts[id]?.prepayment ? Number(drafts[id].prepayment) : lead.prepayment;
      const note = drafts[id]?.note.trim() ? drafts[id].note : lead.internal_note;
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({
          id,
          order_amount: amount,
          prepayment,
          arrived: nextArrived,
          internal_note: note,
          admin_name: adminName,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, arrived: nextArrived } : l)));
    } catch {
      setError('Не удалось изменить пометку. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  // Ручной перенос заявки в архив и обратно (администратор может это делать в любой момент)
  const toggleArchived = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextArchived = !lead.archived;
    setSavingId(id);
    try {
      const res = await fetch(LEADS_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ id, archived: nextArchived, admin_name: adminName }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, archived: nextArchived } : l)));
    } catch {
      setError('Не удалось изменить архив. Попробуйте ещё раз.');
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

  // Временная блокировка/разблокировка доступа клиента в личный кабинет «Гараж» —
  // заблокированный клиент не сможет войти по телефону, даже без пароля
  const toggleGarageBlock = async (id: number) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const nextBlocked = !lead.garage_blocked;
    setSavingId(id);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ action: 'admin_toggle_block', phone: lead.phone, blocked: nextBlocked }),
      });
      if (!res.ok) throw new Error('request failed');
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, garage_blocked: nextBlocked } : l)));
    } catch {
      setError('Не удалось изменить блокировку. Попробуйте ещё раз.');
    } finally {
      setSavingId(null);
    }
  };

  // Заметка привязана к номеру телефона, а не к конкретной заявке — сохраняется на бэкенде
  // по телефону и сразу применяется ко всем заявкам этого клиента в списке (включая будущие)
  const saveClientNote = async (id: number, note: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    const phone10 = phoneLast10(lead.phone);
    setSavingId(id);
    try {
      const res = await fetch(CLIENT_NOTES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify({ phone: lead.phone, note, admin_name: adminName }),
      });
      if (!res.ok) throw new Error('request failed');
      const trimmed = note.trim() || null;
      setLeads((ls) => ls.map((l) => (phoneLast10(l.phone) === phone10 ? { ...l, phone_note: trimmed } : l)));
    } catch {
      setError('Не удалось сохранить заметку. Попробуйте ещё раз.');
      throw new Error('save failed');
    } finally {
      setSavingId(null);
    }
  };

  const isColumnVisible = (key: ColumnKey) => !hiddenColumns.has(key);

  // Видимость столбцов сохраняется в localStorage — при следующем заходе в админку
  // менеджеру не нужно заново скрывать/показывать одни и те же колонки
  const toggleColumn = (key: ColumnKey) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      safeSetItem(HIDDEN_COLUMNS_KEY, JSON.stringify(Array.from(next)));
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
    if (statusTab === 'archived') return leads.filter((l) => l.archived);
    const active = leads.filter((l) => !l.archived);
    if (statusTab === 'all') return active;
    return active.filter((l) => l.status === statusTab);
  }, [leads, statusTab]);

  const newCount = useMemo(() => leads.filter((l) => l.status === 'new' && !l.archived).length, [leads]);
  const inProgressCount = useMemo(() => leads.filter((l) => l.status === 'in_progress' && !l.archived).length, [leads]);
  const doneCount = useMemo(() => leads.filter((l) => l.status === 'done' && !l.archived).length, [leads]);
  const archivedCount = useMemo(() => leads.filter((l) => l.archived).length, [leads]);

  // Точка с числом новых заявок на иконке админки на рабочем столе (Badging API) —
  // обновляется при каждой загрузке/изменении списка, сбрасывается при выходе из админки
  useEffect(() => {
    setAppBadge(authed ? newCount : 0);
  }, [authed, newCount]);

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

  // Выход из админки: очищаем сохранённые пароль/имя в sessionStorage и сбрасываем состояние —
  // пользователь снова увидит форму входа
  const logout = () => {
    safeRemoveSession('admin_password');
    safeRemoveSession('admin_name');
    setPassword('');
    setAdminName('');
    setAuthed(false);
    setLeads([]);
  };

  return {
    password,
    setPassword,
    adminName,
    setAdminName,
    authed,
    loading,
    error,
    leads,
    drafts,
    savingId,
    hiddenColumns,
    columnFilters,
    statusTab,
    setStatusTab,
    pushPermission,
    pushSubscribing,
    subscribePush,
    submit,
    setDraft,
    setPrepaymentDraft,
    setNoteDraft,
    saveLead,
    saveLeadField,
    toggleStatus,
    toggleArrived,
    toggleArchived,
    resetGaragePassword,
    toggleGarageBlock,
    saveClientNote,
    isColumnVisible,
    toggleColumn,
    setColumnFilter,
    suggestionsByColumn,
    newCount,
    inProgressCount,
    doneCount,
    archivedCount,
    filteredLeads,
    hasActiveFilters,
    clearFilters,
    onRefresh: () => load(password),
    logout,
  };
};