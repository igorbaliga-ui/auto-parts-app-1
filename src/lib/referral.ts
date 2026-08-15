import { safeGetItem, safeSetItem, safeGetSession, safeSetSession } from '@/lib/storage';

const REFERRAL_STORAGE_KEY = 'zapoptom_referral_code';

/** Читает код друга из ?ref= в адресе страницы и запоминает его:
 * — в localStorage — чтобы код не терялся при переходах по сайту до момента
 *   отправки заявки (заявку можно отправить и через несколько дней);
 * — в sessionStorage — только для текущего захода на сайт (та же вкладка).
 *   Используется там, где реферальный код не должен «прилипать» навсегда —
 *   например, в инструкции «Установка приложения»: если человек зашёл по
 *   ссылке друга один раз, а в следующий раз открыл сайт напрямую, ссылка
 *   друга там уже не должна подставляться. */
export const captureReferralCodeFromUrl = (): void => {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get('ref') || '').trim().toUpperCase();
    if (ref) {
      safeSetItem(REFERRAL_STORAGE_KEY, ref);
      safeSetSession(REFERRAL_STORAGE_KEY, ref);
    }
  } catch {
    // no-op
  }
};

/** Код друга для атрибуции заявки — живёт до её отправки, даже если человек
 * вернулся на сайт через несколько дней. */
export const getStoredReferralCode = (): string =>
  safeGetItem(REFERRAL_STORAGE_KEY) || '';

/** Код друга только для текущего захода на сайт (сбрасывается при новом
 * визите без ?ref= в адресе) — используется в инструкции установки, чтобы
 * реферальная ссылка не показывалась тем, кто пришёл напрямую. */
export const getSessionReferralCode = (): string =>
  safeGetSession(REFERRAL_STORAGE_KEY) || '';