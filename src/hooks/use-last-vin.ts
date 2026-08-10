import { useEffect, useState } from 'react';
import { safeGetItem, safeSetItem } from '@/lib/storage';

const LAST_VIN_KEY = 'zapoptom_last_vin';
const LAST_VIN_EVENT = 'last-vin-changed';

/** Последний VIN, который клиент вводил на сайте (в любой из форм — Hero, «Подбор по
 * VIN», диалог заявки). Используется, чтобы плавающая кнопка WhatsApp/Telegram могла
 * сразу подставить его в текст сообщения — так менеджеру не нужно переспрашивать VIN. */
export const getLastVin = () => safeGetItem(LAST_VIN_KEY) || '';

export const setLastVin = (vin: string) => {
  const trimmed = vin.trim();
  if (trimmed.length < 5) return; // не запоминаем пустой ввод и случайные пары символов
  safeSetItem(LAST_VIN_KEY, trimmed);
  window.dispatchEvent(new Event(LAST_VIN_EVENT));
};

export const useLastVin = () => {
  const [vin, setVin] = useState(() => getLastVin());

  useEffect(() => {
    const sync = () => setVin(getLastVin());
    window.addEventListener('storage', sync);
    window.addEventListener(LAST_VIN_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(LAST_VIN_EVENT, sync);
    };
  }, []);

  return vin;
};
