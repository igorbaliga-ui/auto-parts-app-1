import { useEffect, useState } from 'react';
import { GARAGE_AUTH_URL } from './garageTypes';

/**
 * Смена номера телефона в личном кабинете «Гараж»: клиент вводит новый номер,
 * подтверждает его звонком (тот же flash-call механизм, что и при входе), после
 * чего бэкенд одной транзакцией переносит все данные (заявки, заметку менеджера,
 * кэшбэк, историю входов, push-подписки, рефералов) со старого номера на новый.
 */
export const usePhoneChange = (currentPhone: string, onSuccess: (newPhone: string) => void) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'input' | 'call'>('input');
  const [newPhone, setNewPhone] = useState('');
  const [callRequested, setCallRequested] = useState(false);
  const [callLoading, setCallLoading] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const reset = () => {
    setStep('input');
    setNewPhone('');
    setCallRequested(false);
    setCallLoading(false);
    setCodeInput('');
    setVerifyLoading(false);
    setCooldown(0);
    setError('');
  };

  const openDialog = () => {
    reset();
    setOpen(true);
  };

  const closeDialog = () => {
    setOpen(false);
    reset();
  };

  const requestCall = async () => {
    setError('');
    if (newPhone.replace(/\D/g, '').length < 11) {
      setError('Телефон указан не полностью');
      return;
    }
    setCallLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_phone_change_call', phone: currentPhone, new_phone: newPhone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Не удалось совершить звонок');
        return;
      }
      setStep('call');
      setCallRequested(true);
      setCodeInput('');
      setCooldown(60);
    } catch {
      setError('Не удалось совершить звонок. Попробуйте ещё раз.');
    } finally {
      setCallLoading(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifyLoading(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_phone_change',
          phone: currentPhone,
          new_phone: newPhone,
          code: codeInput,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Неверный код');
        return;
      }
      closeDialog();
      onSuccess(data.new_phone || `+7${newPhone.replace(/\D/g, '').slice(-10)}`);
    } catch {
      setError('Не удалось подтвердить код. Попробуйте ещё раз.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const backToInput = () => {
    setStep('input');
    setCallRequested(false);
    setCodeInput('');
    setError('');
  };

  return {
    open,
    openDialog,
    closeDialog,
    setOpen,
    step,
    newPhone,
    setNewPhone,
    callRequested,
    callLoading,
    codeInput,
    setCodeInput,
    verifyLoading,
    cooldown,
    setCooldown,
    error,
    requestCall,
    submitCode,
    backToInput,
  };
};