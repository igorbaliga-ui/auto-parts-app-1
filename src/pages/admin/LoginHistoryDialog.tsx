import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatDate } from './adminTypes';

const GARAGE_AUTH_URL = 'https://functions.poehali.dev/d92ac11d-c6d2-4430-b948-a767c0048442';

type LoginHistoryItem = {
  login_type: 'login' | 'reset_password' | 'call_verified' | 'phone_changed' | 'phone_change_reverted';
  device: string;
  created_at: string | null;
  note: string | null;
  reverted: boolean;
  can_revert: boolean;
};

type LoginHistoryDialogProps = {
  phone: string;
  clientLabel: string;
  adminPassword: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReverted?: () => void;
};

const LoginHistoryDialog = ({ phone, clientLabel, adminPassword, open, onOpenChange, onReverted }: LoginHistoryDialogProps) => {
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reverting, setReverting] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    setError('');
    fetch(`${GARAGE_AUTH_URL}?phone=${encodeURIComponent(phone)}&history=1`, {
      headers: { 'X-Admin-Password': adminPassword },
    })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setHistory(Array.isArray(data.history) ? data.history : []))
      .catch(() => setError('Не удалось загрузить историю входов'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone, adminPassword]);

  const revertPhoneChange = async () => {
    setReverting(true);
    try {
      const res = await fetch(GARAGE_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ action: 'admin_revert_phone_change', phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: 'Не удалось отменить смену номера', description: data.error, variant: 'destructive' });
        return;
      }
      toast({ title: 'Смена номера отменена', description: `Данные возвращены на ${data.old_phone}` });
      onOpenChange(false);
      onReverted?.();
    } catch {
      toast({ title: 'Не удалось отменить смену номера', variant: 'destructive' });
    } finally {
      setReverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История входов</DialogTitle>
          <DialogDescription>{clientLabel}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
        ) : error ? (
          <p className="text-primary text-sm py-4">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Входов пока не было.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex flex-col gap-2 border-l-2 pl-3 ${
                  h.login_type === 'phone_changed' || h.login_type === 'phone_change_reverted'
                    ? 'border-amber-500/60'
                    : h.login_type === 'reset_password'
                      ? 'border-primary/40'
                      : 'border-steel'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon
                      name={
                        h.login_type === 'phone_changed' || h.login_type === 'phone_change_reverted'
                          ? 'Smartphone'
                          : h.login_type === 'reset_password'
                            ? 'KeyRound'
                            : 'LogIn'
                      }
                      size={14}
                      className={
                        h.login_type === 'phone_changed' || h.login_type === 'phone_change_reverted'
                          ? 'text-amber-500'
                          : h.login_type === 'reset_password'
                            ? 'text-primary'
                            : 'text-muted-foreground'
                      }
                    />
                    <div>
                      <p className="text-sm">
                        {h.login_type === 'phone_changed'
                          ? `Смена номера телефона${h.reverted ? ' (отменена)' : ''}`
                          : h.login_type === 'phone_change_reverted'
                            ? 'Отмена смены номера'
                            : h.login_type === 'reset_password'
                              ? 'Восстановление пароля'
                              : 'Обычный вход'}
                      </p>
                      {(h.login_type === 'phone_changed' || h.login_type === 'phone_change_reverted') && h.note ? (
                        <p className="text-xs text-amber-500/90">{h.note}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">{h.device}</p>
                      )}
                    </div>
                  </div>
                  {h.created_at && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(h.created_at)}
                    </span>
                  )}
                </div>
                {h.can_revert && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={reverting}
                    onClick={revertPhoneChange}
                    className="self-start text-xs h-7"
                  >
                    <Icon name="Undo2" size={13} className="mr-1.5" />
                    {reverting ? 'Отменяем…' : 'Отменить эту смену номера'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginHistoryDialog;