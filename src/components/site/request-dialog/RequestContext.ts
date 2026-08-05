import { createContext, useContext } from 'react';

export type Ctx = {
  open: (vin?: string, photo?: File | null, phone?: string, name?: string, vinHistory?: string[], city?: string) => void;
};

export const isValidName = (name?: string) => !!name && name.trim().length >= 2;
export const isValidPhone = (phone?: string) => !!phone && phone.replace(/\D/g, '').length >= 10;

export const RequestContext = createContext<Ctx>({ open: () => {} });

export const useRequest = () => useContext(RequestContext);

export const messengers = [
  { id: 'telegram', label: 'Telegram', icon: 'Send' },
  { id: 'max', label: 'MAX', icon: 'MessageSquare' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle' },
] as const;

export const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';

export const STORAGE_KEY = 'zapoptom_request_draft';

export const emptyForm = { vin: '', name: '', phone: '', parts: '', city: '' };

export const loadDraft = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { form: typeof emptyForm; messenger: string | null };
  } catch {
    return null;
  }
};

export type GarageCar = { vin: string; car_name: string };
