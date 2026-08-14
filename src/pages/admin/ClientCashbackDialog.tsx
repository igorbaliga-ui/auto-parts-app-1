import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import CashbackHistoryDialog from './CashbackHistoryDialog';

const CLIENT_CASHBACK_URL = 'https://functions.poehali.dev/9852e677-02a7-403b-9658-35e7a0ac1b66';

type Client = {
  phone_last10: string;
  name: string | null;
  accrued: number;
  deducted: number;
  manual_accrued: number;
  referral_bonus: number;
  total_cashback: number;
};

type OpType = 'deduct' | 'accrue';

const bonusWord = (n: number) => {
  const abs = Math.abs(Math.round(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) return 'бонус';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'бонуса';
  return 'бонусов';
};

const formatMoney = (n: number) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n)} ${bonusWord(n)}`;

type ClientCashbackDialogProps = {
  adminPassword: string;
  adminName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ClientCashbackDialog = ({ adminPassword, adminName, open, onOpenChange }: ClientCashbackDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deductDrafts, setDeductDrafts] = useState<Record<string, string>>({});
  const [opTypeDrafts, setOpTypeDrafts] = useState<Record<string, OpType>>({});
  const [savingPhone, setSavingPhone] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(CLIENT_CASHBACK_URL, { headers: { 'X-Admin-Password': adminPassword } })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .catch(() => setError('Не удалось загрузить список клиентов'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const getOpType = (phoneLast10: string): OpType => opTypeDrafts[phoneLast10] ?? 'deduct';

  const applyOperation = async (phoneLast10: string) => {
    const opType = getOpType(phoneLast10);
    const value = (deductDrafts[phoneLast10] || '').trim();
    const amount = Number(value);
    if (!value || !Number.isFinite(amount) || amount <= 0) {
      setError('Укажите сумму больше нуля');
      return;
    }
    setError('');
    setSavingPhone(phoneLast10);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ phone: phoneLast10, amount, type: opType, admin_name: adminName }),
      });
      if (!res.ok) throw new Error('request failed');
      setClients((cs) =>
        cs.map((c) =>
          c.phone_last10 === phoneLast10
            ? opType === 'deduct'
              ? { ...c, deducted: c.deducted + amount, total_cashback: c.total_cashback - amount }
              : { ...c, manual_accrued: c.manual_accrued + amount, total_cashback: c.total_cashback + amount }
            : c,
        ),
      );
      setDeductDrafts((d) => ({ ...d, [phoneLast10]: '' }));
    } catch {
      setError('Не удалось выполнить операцию. Попробуйте ещё раз.');
    } finally {
      setSavingPhone(null);
    }
  };

  const filtered = clients.filter(
    (c) =>
      !search.trim() ||
      c.phone_last10.includes(search.trim()) ||
      (c.name || '').toLowerCase().includes(search.trim().toLowerCase()),
  );

  const historyClient = clients.find((c) => c.phone_last10 === historyPhone) || null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Бонусы клиентов</DialogTitle>
            <DialogDescription>
              Общие бонусы — 3% от суммы выполненных заказов, начисляются автоматически. Списания
              и ручные начисления меняют общую сумму, которую видит клиент в «Гараже».
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />

          {error && <p className="text-primary text-sm">{error}</p>}

          {loading ? (
            <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Клиенты не найдены.</p>
          ) : (
            <div className="flex flex-col gap-3 py-2">
              {filtered.map((c) => (
                <div
                  key={c.phone_last10}
                  className="flex flex-wrap items-center justify-between gap-3 border border-steel rounded-sm p-3"
                >
                  <div className="min-w-[140px]">
                    <p className="font-head text-sm">{c.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{c.phone_last10}</p>
                    <p className="text-sm text-primary mt-1">Бонусы: {formatMoney(c.total_cashback)}</p>
                    {c.referral_bonus > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Реферальный заработок: {formatMoney(c.referral_bonus)}
                      </p>
                    )}
                    {(c.deducted > 0 || c.manual_accrued > 0) && (
                      <p className="text-xs text-muted-foreground">
                        {c.manual_accrued > 0 && <>Начислено вручную: {formatMoney(c.manual_accrued)}. </>}
                        {c.deducted > 0 && <>Списано всего: {formatMoney(c.deducted)}</>}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex rounded-sm border border-steel overflow-hidden h-9">
                      <button
                        type="button"
                        onClick={() => setOpTypeDrafts((d) => ({ ...d, [c.phone_last10]: 'deduct' }))}
                        className={`px-3 text-xs font-head uppercase tracking-wide transition-colors ${
                          getOpType(c.phone_last10) === 'deduct'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Списать
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpTypeDrafts((d) => ({ ...d, [c.phone_last10]: 'accrue' }))}
                        className={`px-3 text-xs font-head uppercase tracking-wide transition-colors ${
                          getOpType(c.phone_last10) === 'accrue'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Начислить
                      </button>
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Сумма"
                      value={deductDrafts[c.phone_last10] ?? ''}
                      onChange={(e) =>
                        setDeductDrafts((d) => ({ ...d, [c.phone_last10]: e.target.value }))
                      }
                      className="w-24 h-9"
                    />
                    <Button
                      size="sm"
                      disabled={savingPhone === c.phone_last10}
                      onClick={() => applyOperation(c.phone_last10)}
                      className="font-head uppercase tracking-wide text-xs h-9"
                    >
                      {savingPhone === c.phone_last10
                        ? '…'
                        : getOpType(c.phone_last10) === 'deduct'
                          ? 'Списать'
                          : 'Начислить'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setHistoryPhone(c.phone_last10)}
                      className="h-9"
                      title="История операций"
                    >
                      <Icon name="History" size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {historyClient && (
        <CashbackHistoryDialog
          adminPassword={adminPassword}
          phoneLast10={historyClient.phone_last10}
          clientLabel={`${historyClient.name || '—'} · ${historyClient.phone_last10}`}
          open={historyPhone !== null}
          onOpenChange={(o) => !o && setHistoryPhone(null)}
        />
      )}
    </>
  );
};

export default ClientCashbackDialog;