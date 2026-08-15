import { safeGetItem, safeSetItem } from '@/lib/storage';

const REFERRAL_STORAGE_KEY = 'zapoptom_referral_code';

/** Читает код друга из ?ref= в адресе страницы и запоминает его в localStorage,
 * чтобы код не терялся при переходах по сайту до момента отправки заявки.
 * Сразу после этого убирает ?ref= из адресной строки (history.replaceState) —
 * иначе iOS Safari сохраняет полный URL с чужим кодом в историю, и позже при
 * простом наборе «запоптом.рф» подставляет его автозаполнением, ошибочно
 * привязывая случайного посетителя к чужому другу. */
export const captureReferralCodeFromUrl = (): void => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || '').trim().toUpperCase();
    if (ref) {
      safeSetItem(REFERRAL_STORAGE_KEY, ref);
      params.delete('ref');
      const query = params.toString();
      const cleanUrl = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
      window.history.replaceState(window.history.state, '', cleanUrl);
    }
  } catch {
    // no-op
  }
};

export const getStoredReferralCode = (): string =>
  safeGetItem(REFERRAL_STORAGE_KEY) || '';