import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { formatBonus as formatMoney, formatDate } from '@/lib/format';
import { exportReferralsToExcel } from './exportReferrals';

const CLIENT_CASHBACK_URL = 'https://functions.poehali.dev/9852e677-02a7-403b-9658-35e7a0ac1b66';

type ReferralAccrual = {
  lead_id: number;
  amount: number;
  order_amount: number;
  date: string | null;
};

type ReferralDetail = {
  phone_last10: string;
  name: string | null;
  phone: string | null;
  note: string | null;
  bonus_earned: number;
  referred_at: string | null;
  accruals: ReferralAccrual[];
};

type Client = {
  phone_last10: string;
  name: string | null;
  accrued: number;
  deducted: number;
  manual_accrued: number;
  referral_bonus: number;
  friends_invited_count: number;
  total_cashback: number;
  referral_details: ReferralDetail[];
};

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedFriends, setExpandedFriends] = useState<Set<string>>(new Set());

  const toggleExpanded = (phoneLast10: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(phoneLast10)) {
        next.delete(phoneLast10);
      } else {
        next.add(phoneLast10);
      }
      return next;
    });
  };

  const toggleFriendExpanded = (key: string) => {
    setExpandedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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
          {referrers.map((c, i) => {
            const isOpen = expanded.has(c.phone_last10);
            return (
              <div key={c.phone_last10} className="border border-steel rounded-sm">
                <button
                  type="button"
                  onClick={() => toggleExpanded(c.phone_last10)}
                  className="w-full flex items-center justify-between gap-3 p-3 text-left"
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
                    <Icon
                      name={isOpen ? 'ChevronUp' : 'ChevronDown'}
                      size={16}
                      className="text-muted-foreground"
                    />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-steel px-3 py-2 flex flex-col gap-2">
                    {c.referral_details.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">Нет данных о приглашённых.</p>
                    ) : (
                      c.referral_details.map((d) => {
                        const friendKey = `${c.phone_last10}:${d.phone_last10}`;
                        const friendOpen = expandedFriends.has(friendKey);
                        const hasAccruals = d.accruals.length > 0;
                        return (
                          <div key={d.phone_last10} className="border-l-2 border-primary/40 pl-3 py-1">
                            <button
                              type="button"
                              onClick={() => hasAccruals && toggleFriendExpanded(friendKey)}
                              disabled={!hasAccruals}
                              className="w-full flex items-start justify-between gap-3 text-left disabled:cursor-default"
                            >
                              <div className="min-w-0">
                                <p className="text-sm truncate">{d.name || '—'}</p>
                                <p className="text-xs text-muted-foreground">{d.phone || d.phone_last10}</p>
                                {d.note && (
                                  <p className="text-xs text-amber-500/90 mt-0.5">{d.note}</p>
                                )}
                                {d.referred_at && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Приглашён: {formatDate(d.referred_at)}
                                  </p>
                                )}
                              </div>
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className="text-sm text-primary font-head whitespace-nowrap">
                                  +{formatMoney(d.bonus_earned)}
                                </span>
                                {hasAccruals && (
                                  <Icon
                                    name={friendOpen ? 'ChevronUp' : 'ChevronDown'}
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                )}
                              </span>
                            </button>
                            {friendOpen && hasAccruals && (
                              <div className="mt-2 flex flex-col gap-1.5">
                                {d.accruals.map((a) => (
                                  <div
                                    key={a.lead_id}
                                    className="flex items-center justify-between gap-3 text-xs bg-muted/40 rounded-sm px-2 py-1.5"
                                  >
                                    <span className="text-muted-foreground">
                                      {a.date ? formatDate(a.date) : '—'}
                                      <span className="ml-1.5 opacity-70">
                                        (заказ на {formatMoney(a.order_amount)})
                                      </span>
                                    </span>
                                    <span className="text-primary font-head whitespace-nowrap shrink-0">
                                      +{formatMoney(a.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminReferralsTab;