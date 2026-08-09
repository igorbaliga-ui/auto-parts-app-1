/**
 * Безопасные обёртки над localStorage/sessionStorage.
 * В приватном/инкогнито режиме (особенно iOS Safari) или при отключённых
 * сайтовых данных вызов setItem/getItem может выбросить исключение
 * (QuotaExceededError, SecurityError) и уронить весь скрипт — на разных
 * телефонах это выглядит как "сайт не грузится" без единой видимой причины.
 * Все обращения к storage в проекте должны идти через эти функции.
 */

export const safeGetItem = (key: string, storage: Storage = localStorage): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const safeSetItem = (key: string, value: string, storage: Storage = localStorage): boolean => {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeRemoveItem = (key: string, storage: Storage = localStorage): void => {
  try {
    storage.removeItem(key);
  } catch {
    /* no-op */
  }
};

export const safeGetSession = (key: string): string | null => safeGetItem(key, sessionStorage);
export const safeSetSession = (key: string, value: string): boolean => safeSetItem(key, value, sessionStorage);
export const safeRemoveSession = (key: string): void => safeRemoveItem(key, sessionStorage);

/** Безопасный JSON.parse из storage — не падает на битых/чужих данных. */
export const safeGetJSON = <T,>(key: string, storage: Storage = localStorage): T | null => {
  const raw = safeGetItem(key, storage);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
