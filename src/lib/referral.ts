import { safeGetItem, safeSetItem } from '@/lib/storage';

const REFERRAL_STORAGE_KEY = 'zapoptom_referral_code';

/** Читает код друга из ?ref= в адресе страницы и запоминает его в localStorage,
 * чтобы код не терялся при переходах по сайту до момента отправки заявки. */
export const captureReferralCodeFromUrl = (): void => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || '').trim().toUpperCase();
    if (ref) {
      safeSetItem(REFERRAL_STORAGE_KEY, ref);
    }
  } catch {
    // no-op
  }
};

export const getStoredReferralCode = (): string =>
  safeGetItem(REFERRAL_STORAGE_KEY) || '';
