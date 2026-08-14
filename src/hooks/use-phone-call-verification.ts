import { useEffect, useState } from 'react';

const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';

/**
 * Переиспользуемая логика подтверждения номера телефона звонком (flash call):
 * проверка, подтверждён ли номер, заказ звонка, ввод кода, повторный звонок с
 * задержкой. Использует тот же backend, что и вход в «Гараж» (garage-auth) —
 * один раз подтверждённый номер повторно код не запрашивает.
 */
export const usePhoneCallVerification = () => {
  const [callRequested, setCallRequested] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [callCooldown, setCallCooldown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (callCooldown <= 0) return;
    const t = setTimeout(() => setCallCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [callCooldown]);

  const checkPhoneVerified = async (phone: string): Promise<boolean> => {
    try {
      const res = await fetch(`${GARAGE_AUTH_URL}?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.phone_verified;
    } catch {
      return false;
    }
  };

  const requestCall = async (phone: string) => {
    setError('');
    setCallLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_call_verification', phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Не удалось совершить звонок');
        return;
      }
      setCallRequested(true);
      setCodeInput('');
      setCallCooldown(60);
    } catch {
      setError('Не удалось совершить звонок. Попробуйте ещё раз.');
    } finally {
      setCallLoading(false);
    }
  };

  const verifyCode = async (phone: string): Promise<boolean> => {
    setError('');
    setVerifyLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_call', phone, code: codeInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Неверный код');
        return false;
      }
      setCodeInput('');
      return true;
    } catch {
      setError('Не удалось подтвердить код. Попробуйте ещё раз.');
      return false;
    } finally {
      setVerifyLoading(false);
    }
  };

  const reset = () => {
    setCallRequested(false);
    setCodeInput('');
    setError('');
  };

  return {
    callRequested,
    callLoading,
    codeInput,
    setCodeInput,
    verifyLoading,
    callCooldown,
    error,
    checkPhoneVerified,
    requestCall,
    verifyCode,
    reset,
  };
};
