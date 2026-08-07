export const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';
export const GARAGE_CAR_NAME_URL = 'https://functions.poehali.dev/22aa943f-f262-4beb-b2e2-c713d1684c82';
export const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';
export const STORAGE_KEY = 'zapoptom_garage_phone';
export const PASSWORD_VERIFIED_KEY = 'zapoptom_garage_password_verified';

export type Order = {
  id: number;
  vin: string | null;
  name: string;
  phone: string;
  parts: string | null;
  messenger: string | null;
  order_amount: number | null;
  prepayment: number | null;
  remaining: number | null;
  cashback: number | null;
  pending_cashback: number | null;
  created_at: string;
  car_name: string | null;
  city: string | null;
  status: 'new' | 'in_progress' | 'done';
  completed_at: string | null;
  arrived: boolean;
  archived: boolean;
  in_progress_at: string | null;
  arrived_at: string | null;
};

export type CashbackHistoryItem = {
  type: 'accrual' | 'deduction';
  amount: number;
  label: string;
  created_at: string | null;
};

export const messengerLabel: Record<string, string> = {
  telegram: 'Telegram',
  max: 'MAX',
  whatsapp: 'WhatsApp',
};

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

export const formatMoney = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';