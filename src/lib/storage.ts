/**
 * Безопасные обёртки над localStorage/sessionStorage.
 * В приватном/инкогнито режиме (особенно iOS Safari) или при отключённых
 * сайтовых данных вызов setItem/getItem может выбросить исключение
 * (QuotaExceededError, SecurityError) и уронить весь скрипт — на разных
 * телефонах это выглядит как "сайт не грузится" без единой видимой причины.
 * Все обращения к storage в проекте должны идти через эти функции.
 * На сервере (SSR) хранилищ нет: обращение к ним происходит лениво внутри try,
 * поэтому там функции просто возвращают null/false.
 */

export const safeGetItem = (key: string, storage?: Storage): string | null => {
  try {
    return (storage ?? localStorage).getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (key: string, value: string, storage?: Storage): boolean => {
  try {
    (storage ?? localStorage).setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeRemoveItem = (key: string, storage?: Storage): void => {
  try {
    (storage ?? localStorage).removeItem(key);
  } catch {
    /* no-op */
  }
};

const getSessionStorage = (): Storage | null => {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
};

export const safeGetSession = (key: string): string | null => {
  const s = getSessionStorage();
  return s ? safeGetItem(key, s) : null;
};
export const safeSetSession = (key: string, value: string): boolean => {
  const s = getSessionStorage();
  return s ? safeSetItem(key, value, s) : false;
};
export const safeRemoveSession = (key: string): void => {
  const s = getSessionStorage();
  if (s) safeRemoveItem(key, s);
};

/** Безопасный JSON.parse из storage — не падает на битых/чужих данных. */
export const safeGetJSON = <T,>(key: string, storage?: Storage): T | null => {
  const raw = safeGetItem(key, storage);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
