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

const CLIENT_CASHBACK_URL = 'https://functions.poehali.dev/9852e677-02a7-403b-9658-35e7a0ac1b66';

type Client = {
  phone_last10: string;
  name: string | null;
  auto_cashback: number;
  cashback_override: number | null;
};

const formatMoney = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₽';

type ClientCashbackDialogProps = {
  adminPassword: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ClientCashbackDialog = ({ adminPassword, open, onOpenChange }: ClientCashbackDialogProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingPhone, setSavingPhone] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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
        setDrafts(
          Object.fromEntries(
            list.map((c) => [
              c.phone_last10,
              c.cashback_override !== null ? String(c.cashback_override) : String(c.auto_cashback),
            ]),
          ),
        );
      })
      .catch(() => setError('Не удалось загрузить список клиентов'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async (phoneLast10: string) => {
    const value = drafts[phoneLast10];
    const client = clients.find((c) => c.phone_last10 === phoneLast10);
    if (!client) return;
    const num = value.trim() === '' ? null : Number(value);
    setSavingPhone(phoneLast10);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ phone: phoneLast10, cashback_override: num }),
      });
      if (!res.ok) throw new Error('request failed');
      setClients((cs) =>
        cs.map((c) => (c.phone_last10 === phoneLast10 ? { ...c, cashback_override: num } : c)),
      );
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    } finally {
      setSavingPhone(null);
    }
  };

  const reset = async (phoneLast10: string) => {
    const client = clients.find((c) => c.phone_last10 === phoneLast10);
    if (!client) return;
    setDrafts((d) => ({ ...d, [phoneLast10]: String(client.auto_cashback) }));
    setSavingPhone(phoneLast10);
    try {
      const res = await fetch(CLIENT_CASHBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': adminPassword },
        body: JSON.stringify({ phone: phoneLast10, cashback_override: null }),
      });
      if (!res.ok) throw new Error('request failed');
      setClients((cs) =>
        cs.map((c) => (c.phone_last10 === phoneLast10 ? { ...c, cashback_override: null } : c)),
      );
    } catch {
      setError('Не удалось сбросить. Попробуйте ещё раз.');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Кэшбэк клиентов</DialogTitle>
          <DialogDescription>
            По умолчанию — 3% от суммы выполненных заказов. Можно задать своё итоговое значение —
            клиент увидит именно его в «Гараже».
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Поиск по имени или телефону"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />

        {loading ? (
          <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
        ) : error ? (
          <p className="text-primary text-sm py-4">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">Клиенты не найдены.</p>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {filtered.map((c) => {
              const isOverridden = c.cashback_override !== null;
              return (
                <div
                  key={c.phone_last10}
                  className="flex flex-wrap items-center justify-between gap-3 border border-steel rounded-sm p-3"
                >
                  <div className="min-w-[140px]">
                    <p className="font-head text-sm">{c.name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{c.phone_last10}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Авторасчёт: {formatMoney(c.auto_cashback)}
                      {isOverridden && <span className="text-primary"> · изменено вручную</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={drafts[c.phone_last10] ?? ''}
                      onChange={(e) =>
                        setDrafts((d) => ({ ...d, [c.phone_last10]: e.target.value }))
                      }
                      className="w-28 h-9"
                    />
                    <Button
                      size="sm"
                      disabled={savingPhone === c.phone_last10}
                      onClick={() => save(c.phone_last10)}
                      className="font-head uppercase tracking-wide text-xs h-9"
                    >
                      {savingPhone === c.phone_last10 ? '…' : 'Сохранить'}
                    </Button>
                    {isOverridden && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={savingPhone === c.phone_last10}
                        onClick={() => reset(c.phone_last10)}
                        className="h-9"
                        title="Сбросить к автоматическому расчёту"
                      >
                        <Icon name="RotateCcw" size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ClientCashbackDialog;