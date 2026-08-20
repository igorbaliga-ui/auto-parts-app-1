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
import { toast } from '@/hooks/use-toast';
import { formatBonus as formatMoney } from '@/lib/format';
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
  cashback_percent: number;
  referral_percent: number;
};

type OpType = 'deduct' | 'accrue';

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
  const [percentDrafts, setPercentDrafts] = useState<
    Record<string, { cashback: string; referral: string }>
  >({});
  const [savingPercentPhone, setSavingPercentPhone] = useState<string | null>(null);
  const [signupBonusDraft, setSignupBonusDraft] = useState('');
  const [savingSignupBonus, setSavingSignupBonus] = useState(false);
  const [defaultCashbackDraft, setDefaultCashbackDraft] = useState('');
  const [defaultReferralDraft, setDefaultReferralDraft] = useState('');
  const [savingDefaultPercents, setSavingDefaultPercents] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(CLIENT_CASHBACK_URL, { headers: { 'X-Admin-Password': adminPassword } })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => {
        const list: Client[] = data.clients || [];
        setClients(list);
        setPercentDrafts(
          Object.fromEntries(
            list.map((c) => [
              c.phone_last10,
              { cashback: String(c.cashback_percent), referral: String(c.referral_percent) },
            ]),
          ),
        );
      })
      .catch(() => setError('Не удалось загрузить список клиентов'))
      .finally(() => setLoading(false));

    fetch(`${CLIENT_CASHBACK_URL}?settings=1`, { headers: { 'X-Admin-Password': adminPassword } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.signup_bonus_amount === 'number') {
          setSignupBonusDraft(String(data.signup_bonus_amount));
        }
        if (data && typeof data.default_cashback_percent === 'number') {
          setDefaultCashbackDraft(String(data.default_cashback_percent));
        }
        if (data && typeof data.default_referral_percent === 'number') {
          setDefaultReferralDraft(String(data.default_referral_percent));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveSignupBonus = async () => {
    const amount = Number(signupBonusDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      setError('Сумма бонуса за регистрацию должна быть 0 или больше');
      return;
    }
    setError('');
    setSavingSignupBonus(true);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ action: 'set_signup_bonus', signup_bonus_amount: amount }),
      });
      if (!res.ok) throw new Error('request failed');
      toast({ title: 'Бонус за регистрацию сохранён' });
    } catch {
      setError('Не удалось сохранить бонус за регистрацию. Попробуйте ещё раз.');
    } finally {
      setSavingSignupBonus(false);
    }
  };

  const saveDefaultPercents = async () => {
    const cashbackPercent = Number(defaultCashbackDraft);
    const referralPercent = Number(defaultReferralDraft);
    if (!Number.isFinite(cashbackPercent) || cashbackPercent < 0 || cashbackPercent > 100) {
      setError('Кешбэк по умолчанию должен быть от 0 до 100');
      return;
    }
    if (!Number.isFinite(referralPercent) || referralPercent < 0 || referralPercent > 100) {
      setError('Кешбэк за друга по умолчанию должен быть от 0 до 100');
      return;
    }
    setError('');
    setSavingDefaultPercents(true);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({
          action: 'set_default_percents',
          default_cashback_percent: cashbackPercent,
          default_referral_percent: referralPercent,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      toast({ title: 'Проценты по умолчанию сохранены' });
    } catch {
      setError('Не удалось сохранить проценты по умолчанию. Попробуйте ещё раз.');
    } finally {
      setSavingDefaultPercents(false);
    }
  };

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

  const savePercents = async (phoneLast10: string) => {
    const draft = percentDrafts[phoneLast10];
    if (!draft) return;
    const cashbackPercent = Number(draft.cashback);
    const referralPercent = Number(draft.referral);
    if (!Number.isFinite(cashbackPercent) || cashbackPercent < 0 || cashbackPercent > 100) {
      setError('Процент бонуса за покупки должен быть от 0 до 100');
      return;
    }
    if (!Number.isFinite(referralPercent) || referralPercent < 0 || referralPercent > 100) {
      setError('Процент бонуса за друга должен быть от 0 до 100');
      return;
    }
    setError('');
    setSavingPercentPhone(phoneLast10);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({
          action: 'set_percent',
          phone: phoneLast10,
          cashback_percent: cashbackPercent,
          referral_percent: referralPercent,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setClients((cs) =>
        cs.map((c) =>
          c.phone_last10 === phoneLast10
            ? { ...c, cashback_percent: cashbackPercent, referral_percent: referralPercent }
            : c,
        ),
      );
      toast({ title: 'Проценты сохранены' });
    } catch {
      setError('Не удалось сохранить проценты. Попробуйте ещё раз.');
    } finally {
      setSavingPercentPhone(null);
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
              Бонусы начисляются автоматически по индивидуальному проценту каждого клиента —
              от суммы выполненных заказов и от заказов приглашённых друзей. Проценты можно
              менять для каждого клиента отдельно. Списания и ручные начисления меняют общую
              сумму, которую видит клиент в «Гараже».
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-3 border border-steel rounded-sm p-3">
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
                Бонус за регистрацию
              </label>
              <p className="text-xs text-muted-foreground mb-1.5 max-w-xs">
                Начисляется один раз всем новым клиентам при первой заявке
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="0"
                value={signupBonusDraft}
                onChange={(e) => setSignupBonusDraft(e.target.value)}
                className="w-32 h-9"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={savingSignupBonus}
              onClick={saveSignupBonus}
              className="font-head uppercase tracking-wide text-xs h-9"
            >
              {savingSignupBonus ? '…' : 'Сохранить'}
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-3 border border-steel rounded-sm p-3">
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
                Кешбэк по умолчанию
              </label>
              <p className="text-xs text-muted-foreground mb-1.5 max-w-xs">
                Показывается на сайте всем посетителям и применяется новым клиентам
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                placeholder="3"
                value={defaultCashbackDraft}
                onChange={(e) => setDefaultCashbackDraft(e.target.value)}
                className="w-32 h-9"
              />
            </div>
            <div>
              <label className="text-muted-foreground text-xs uppercase tracking-wide block mb-1">
                Кешбэк за друга по умолчанию
              </label>
              <p className="text-xs text-muted-foreground mb-1.5 max-w-xs">
                Показывается на сайте всем посетителям
              </p>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                placeholder="2"
                value={defaultReferralDraft}
                onChange={(e) => setDefaultReferralDraft(e.target.value)}
                className="w-32 h-9"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={savingDefaultPercents}
              onClick={saveDefaultPercents}
              className="font-head uppercase tracking-wide text-xs h-9"
            >
              {savingDefaultPercents ? '…' : 'Сохранить'}
            </Button>
          </div>

          <Input
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 mt-1"
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
                  className="flex flex-col gap-3 border border-steel rounded-sm p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
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

                  <div className="flex items-center gap-3 flex-wrap border-t border-steel pt-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">За покупки</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={percentDrafts[c.phone_last10]?.cashback ?? ''}
                        onChange={(e) =>
                          setPercentDrafts((d) => ({
                            ...d,
                            [c.phone_last10]: { ...d[c.phone_last10], cashback: e.target.value },
                          }))
                        }
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">За друга</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        value={percentDrafts[c.phone_last10]?.referral ?? ''}
                        onChange={(e) =>
                          setPercentDrafts((d) => ({
                            ...d,
                            [c.phone_last10]: { ...d[c.phone_last10], referral: e.target.value },
                          }))
                        }
                        className="w-16 h-8 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={savingPercentPhone === c.phone_last10}
                      onClick={() => savePercents(c.phone_last10)}
                      className="font-head uppercase tracking-wide text-xs h-8"
                    >
                      {savingPercentPhone === c.phone_last10 ? '…' : 'Сохранить проценты'}
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