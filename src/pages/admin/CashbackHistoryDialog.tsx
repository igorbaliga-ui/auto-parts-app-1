import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatDate } from './adminTypes';

const CLIENT_CASHBACK_URL = 'https://functions.poehali.dev/9852e677-02a7-403b-9658-35e7a0ac1b66';

const formatMoney = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';

type Deduction = {
  id: number;
  amount: number;
  type: 'deduct' | 'accrue';
  admin_name: string | null;
  created_at: string;
};

type CashbackHistoryDialogProps = {
  adminPassword: string;
  phoneLast10: string;
  clientLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CashbackHistoryDialog = ({
  adminPassword,
  phoneLast10,
  clientLabel,
  open,
  onOpenChange,
}: CashbackHistoryDialogProps) => {
  const [history, setHistory] = useState<Deduction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    fetch(`${CLIENT_CASHBACK_URL}?phone=${encodeURIComponent(phoneLast10)}`, {
      headers: { 'X-Admin-Password': adminPassword },
    })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setHistory(data.history || []))
      .catch(() => setError('Не удалось загрузить историю списаний'))
      .finally(() => setLoading(false));
  }, [open, phoneLast10, adminPassword]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>История операций с кэшбэком</DialogTitle>
          <DialogDescription>{clientLabel}</DialogDescription>
        </DialogHeader>
        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
        ) : error ? (
          <p className="text-primary text-sm py-4">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Операций пока не было.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {history.map((h) => (
              <div
                key={h.id}
                className={`flex items-center justify-between border-l-2 pl-3 ${
                  h.type === 'accrue' ? 'border-green-500/50' : 'border-primary/40'
                }`}
              >
                <div>
                  <p className="text-sm">
                    {h.type === 'accrue' ? 'Начислено' : 'Списано'} {formatMoney(h.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{h.admin_name || 'Менеджер'}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CashbackHistoryDialog;