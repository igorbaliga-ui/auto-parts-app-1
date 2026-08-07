import { useEffect, useState } from 'react';

export const GARAGE_PHONE_KEY = 'zapoptom_garage_phone';

const getStoredPhone = () => localStorage.getItem(GARAGE_PHONE_KEY);

export const notifyGarageAuthChanged = () => {
  window.dispatchEvent(new Event('garage-auth-changed'));
};

// Отдельное событие: заявка отправлена, но пользователь остался авторизован —
// список заказов в «Гараже» нужно тихо обновить, без полной перезагрузки страницы
export const notifyGarageOrdersChanged = () => {
  window.dispatchEvent(new Event('garage-orders-changed'));
};

export const useGarageAuth = () => {
  const [phone, setPhone] = useState<string | null>(() => getStoredPhone());

  useEffect(() => {
    const sync = () => setPhone(getStoredPhone());
    window.addEventListener('storage', sync);
    window.addEventListener('garage-auth-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('garage-auth-changed', sync);
    };
  }, []);

  return { authed: !!phone, phone };
};