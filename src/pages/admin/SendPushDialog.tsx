import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const ADMIN_SEND_PUSH_URL = 'https://functions.poehali.dev/34a554a6-5792-424c-b83e-678e43c707f1';

const MAX_LENGTH = 500;

type SendPushDialogProps = {
  leadId: number;
  clientLabel: string;
  adminPassword: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Диалог отправки индивидуального Web Push уведомления конкретному клиенту —
 * произвольный текст от менеджера (не привязан к смене статуса заказа).
 * Доставляется только если клиент когда-либо включал уведомления в «Гараже».
 */
const SendPushDialog = ({ leadId, clientLabel, adminPassword, open, onOpenChange }: SendPushDialogProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(ADMIN_SEND_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ id: leadId, message: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'request failed');
      if (data.sent > 0) {
        toast({ title: 'Уведомление отправлено', description: `Доставлено на ${data.sent} устройств${data.sent === 1 ? 'о' : 'а'} клиента.` });
      } else {
        toast({
          title: 'Клиент не подписан на уведомления',
          description: 'Он ещё не включал push-уведомления в «Гараже» — сообщение не доставлено.',
          variant: 'destructive',
        });
      }
      setMessage('');
      onOpenChange(false);
    } catch {
      toast({ title: 'Не удалось отправить', description: 'Попробуйте ещё раз.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Push-уведомление клиенту</DialogTitle>
          <DialogDescription>{clientLabel}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Например: Здравствуйте! Уточните, пожалуйста, удобное время для звонка."
            className="min-h-24 text-sm"
            autoFocus
          />
          <span className="text-xs text-muted-foreground text-right">
            {message.length}/{MAX_LENGTH}
          </span>
        </div>
        <Button
          onClick={send}
          disabled={sending || !message.trim()}
          className="font-head uppercase tracking-wide text-xs h-10"
        >
          {sending ? 'Отправляем…' : 'Отправить уведомление'}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SendPushDialog;
