export type Lead = {
  id: number;
  vin: string | null;
  name: string;
  phone: string;
  parts: string | null;
  messenger: string | null;
  photo_url: string | null;
  photo_urls: string[];
  order_amount: number | null;
  prepayment: number | null;
  remaining: number | null;
  cashback: number | null;
  created_at: string;
  car_name: string | null;
  city: string | null;
  mileage: number | null;
  status: 'new' | 'in_progress' | 'done';
  completed_at: string | null;
  arrived: boolean;
  internal_note: string | null;
  archived: boolean;
  garage_blocked: boolean;
  phone_verified: boolean;
  phone_note: string | null;
  invited_by_name: string | null;
  invited_by_phone: string | null;
  friends_invited_count: number;
  referral_bonus_earned: number;
  handled_by: string | null;
};

export const messengerLabel: Record<string, string> = {
  telegram: 'Telegram',
  max: 'MAX',
  whatsapp: 'WhatsApp',
};

export const statusLabel: Record<Lead['status'], string> = {
  new: 'Новая',
  in_progress: 'Выполнено',
  done: 'Выполнен',
};

const bonusWord = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'бонус';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'бонуса';
  return 'бонусов';
};

export const formatBonus = (n: number) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ${bonusWord(n)}`;

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export type ColumnKey =
  | 'number'
  | 'date'
  | 'vin'
  | 'car'
  | 'name'
  | 'phone'
  | 'city'
  | 'mileage'
  | 'messenger'
  | 'parts'
  | 'photo'
  | 'amount'
  | 'prepayment'
  | 'remaining'
  | 'cashback'
  | 'status'
  | 'completed_at'
  | 'internal_note'
  | 'phone_note'
  | 'handled_by';

export type ColumnDef = {
  key: ColumnKey;
  label: string;
  searchable: boolean;
  getSearchValue?: (l: Lead) => string;
};

export const columns: ColumnDef[] = [
  { key: 'number', label: '№', searchable: true, getSearchValue: (l) => String(l.id) },
  { key: 'date', label: 'Дата', searchable: true, getSearchValue: (l) => formatDate(l.created_at) },
  { key: 'vin', label: 'VIN', searchable: true, getSearchValue: (l) => l.vin || '' },
  { key: 'car', label: 'Авто', searchable: true, getSearchValue: (l) => l.car_name || '' },
  { key: 'name', label: 'Имя', searchable: true, getSearchValue: (l) => l.name || '' },
  { key: 'phone', label: 'Телефон', searchable: true, getSearchValue: (l) => l.phone || '' },
  { key: 'city', label: 'Город', searchable: true, getSearchValue: (l) => l.city || '' },
  {
    key: 'mileage',
    label: 'Пробег',
    searchable: true,
    getSearchValue: (l) => (l.mileage != null ? String(l.mileage) : ''),
  },
  {
    key: 'messenger',
    label: 'Мессенджер',
    searchable: true,
    getSearchValue: (l) => (l.messenger ? messengerLabel[l.messenger] ?? l.messenger : ''),
  },
  { key: 'parts', label: 'Запчасти', searchable: true, getSearchValue: (l) => l.parts || '' },
  { key: 'photo', label: 'Фото СТС', searchable: false },
  { key: 'amount', label: 'Сумма заказа', searchable: false },
  { key: 'prepayment', label: 'Предоплата', searchable: false },
  { key: 'remaining', label: 'Остаток', searchable: false },
  { key: 'cashback', label: 'Бонусы 3%', searchable: false },
  {
    key: 'status',
    label: 'Статус',
    searchable: true,
    getSearchValue: (l) => statusLabel[l.status],
  },
  {
    key: 'completed_at',
    label: 'Дата выполнения',
    searchable: true,
    getSearchValue: (l) => (l.completed_at ? formatDate(l.completed_at) : ''),
  },
  {
    key: 'handled_by',
    label: 'Менеджер',
    searchable: true,
    getSearchValue: (l) => l.handled_by || '',
  },
  {
    key: 'internal_note',
    label: 'Заметка',
    searchable: true,
    getSearchValue: (l) => l.internal_note || '',
  },
  {
    key: 'phone_note',
    label: 'Заметка по клиенту',
    searchable: true,
    getSearchValue: (l) => l.phone_note || '',
  },
];