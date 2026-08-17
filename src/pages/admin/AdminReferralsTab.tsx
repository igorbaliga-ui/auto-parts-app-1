import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { exportReferralsToExcel } from './exportReferrals';

const CLIENT_CASHBACK_URL = 'https://functions.poehali.dev/9852e677-02a7-403b-9658-35e7a0ac1b66';

type Client = {
  phone_last10: string;
  name: string | null;
  accrued: number;
  deducted: number;
  manual_accrued: number;
  referral_bonus: number;
  friends_invited_count: number;
  total_cashback: number;
};

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

type AdminReferralsTabProps = {
  adminPassword: string;
};

/**
 * Отдельная вкладка в админке — рейтинг клиентов по реферальной программе:
 * кто сколько друзей привёл и сколько заработал бонусов (по своему индивидуальному
 * проценту от суммы выполненных заказов приглашённых, задаётся в «Бонусы клиентов»).
 * Использует тот же backend, что и «Бонусы клиентов», но показывает только тех,
 * кто хоть кого-то пригласил, отсортированных по количеству друзей и заработку.
 */
const AdminReferralsTab = ({ adminPassword }: AdminReferralsTabProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(CLIENT_CASHBACK_URL, { headers: { 'X-Admin-Password': adminPassword } })
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => setClients(data.clients || []))
      .catch(() => setError('Не удалось загрузить рейтинг рефералов'))
      .finally(() => setLoading(false));
  }, [adminPassword]);

  const referrers = clients
    .filter((c) => c.friends_invited_count > 0)
    .filter(
      (c) =>
        !search.trim() ||
        c.phone_last10.includes(search.trim()) ||
        (c.name || '').toLowerCase().includes(search.trim().toLowerCase()),
    )
    .sort((a, b) => {
      if (b.friends_invited_count !== a.friends_invited_count) {
        return b.friends_invited_count - a.friends_invited_count;
      }
      return b.referral_bonus - a.referral_bonus;
    });

  return (
    <div className="max-w-3xl bg-card border border-steel rounded-sm p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-head uppercase tracking-wide text-lg flex items-center gap-2">
            <Icon name="Trophy" size={18} className="text-primary" />
            Рейтинг рефералов
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Клиенты, которые приглашают друзей, отсортированы по количеству приглашённых и
            заработанным бонусам (по индивидуальному проценту каждого от суммы выполненных
            заказов приглашённых).
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => exportReferralsToExcel(referrers)}
          disabled={referrers.length === 0}
          className="font-head uppercase tracking-wide shrink-0"
        >
          <Icon name="FileSpreadsheet" size={16} className="sm:mr-2" />
          <span className="hidden sm:inline">Выгрузить в Excel</span>
        </Button>
      </div>

      <Input
        placeholder="Поиск по имени или телефону"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <p className="text-primary text-sm">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground text-sm py-4">Загружаем…</p>
      ) : referrers.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">
          Пока никто не приглашал друзей.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {referrers.map((c, i) => (
            <div
              key={c.phone_last10}
              className="flex items-center justify-between gap-3 border border-steel rounded-sm p-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center font-head text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-head text-sm truncate">{c.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{c.phone_last10}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground" title="Приглашено друзей">
                  <Icon name="Users" size={14} className="text-primary" />
                  {c.friends_invited_count}
                </span>
                <span className="text-sm text-primary font-head whitespace-nowrap" title="Заработано на рефералах">
                  {formatMoney(c.referral_bonus)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReferralsTab;