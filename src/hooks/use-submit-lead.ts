import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

const LEADS_SUBMIT_URL = 'https://functions.poehali.dev/defcccf2-d62a-428a-98ec-9a007f560b83';

type LeadPayload = {
  vin: string;
  name: string;
  phone: string;
  parts: string;
  messenger: string | null;
};

export const useSubmitLead = (onSuccess: () => void) => {
  const [submitting, setSubmitting] = useState(false);

  const submitLead = async (payload: LeadPayload) => {
    setSubmitting(true);
    try {
      const res = await fetch(LEADS_SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('request failed');
      toast({
        title: 'Заявка принята',
        description: 'Менеджер свяжется с вами в течение 15 минут.',
      });
      onSuccess();
    } catch {
      toast({
        title: 'Не удалось отправить заявку',
        description: 'Попробуйте ещё раз или позвоните нам.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return { submitLead, submitting };
};
