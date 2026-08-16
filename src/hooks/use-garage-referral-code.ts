import { useEffect, useState } from 'react';
import { useGarageAuth } from '@/hooks/use-garage-auth';

const GARAGE_LOOKUP_URL = 'https://functions.poehali.dev/767e29c1-99e4-40b9-a0c8-d5b8e2aaddf1';

/**
 * Персональный промокод авторизованного клиента «Гаража» — используется, чтобы
 * кнопка «Поделиться» в шапке сайта делилась той же ссылкой/текстом, что и
 * кнопка «Поделиться промокодом» в личном кабинете.
 */
export const useGarageReferralCode = () => {
  const { authed, phone } = useGarageAuth();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    if (!authed || !phone) {
      setReferralCode(null);
      return;
    }
    let cancelled = false;
    fetch(`${GARAGE_LOOKUP_URL}?phone=${encodeURIComponent(phone)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setReferralCode(typeof data.referral_code === 'string' ? data.referral_code : null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [authed, phone]);

  return referralCode;
};
