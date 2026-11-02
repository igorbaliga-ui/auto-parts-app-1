import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cabApi, money } from './api';

type Data = {
  summary: { orders: number; sale: string; buy: string };
  by_supplier: { supplier_name: string; positions: number; qty: number; buy: string; sale: string; avg_days: string | null }[];
  top_search: { query: string; cnt: number; found: number }[];
  not_found: { query: string; cnt: number }[];
  top_items: { article: string; brand: string; qty: number; sale: string }[];
};

const Card = ({ label, value }: { label: string; value: string | number }) => (
  <div className="border border-border rounded-sm p-4">
    <div className="text-xs uppercase text-muted-foreground">{label}</div>
    <div className="text-xl font-medium mt-1">{value}</div>
  </div>
);

const AnalyticsTab = ({ url }: { url: string }) => {
  const [days, setDays] = useState(30);
  const [d, setD] = useState<Data | null>(null);

  useEffect(() => {
    cabApi<Data>(url, 'analytics', { days }).then(setD);
  }, [url, days]);

  const sale = Number(d?.summary.sale || 0);
  const buy = Number(d?.summary.buy || 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-head uppercase tracking-wide text-xl">Аналитика закупок</h2>
          <p className="text-sm text-muted-foreground">Заказы, закупки у поставщиков и что чаще ищут.</p>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((n) => (
            <Button key={n} size="sm" variant={days === n ? 'default' : 'outline'} onClick={() => setDays(n)}>
              {n} дней
            </Button>
          ))}
        </div>
      </div>
      {d && (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Card label="Заказов" value={d.summary.orders} />
            <Card label="Продано на" value={money(sale)} />
            <Card label="Закуплено на" value={money(buy)} />
            <Card label="Маржа" value={money(sale - buy)} />
          </div>
          <section>
            <h3 className="font-head uppercase text-sm mb-2">Поставщики</h3>
            {d.by_supplier.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет заказов за период.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Поставщик</th>
                      <th className="text-right p-2">Позиций</th>
                      <th className="text-right p-2">Штук</th>
                      <th className="text-right p-2">Закуплено</th>
                      <th className="text-right p-2">Продано</th>
                      <th className="text-right p-2">Средний срок</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.by_supplier.map((s) => (
                      <tr key={s.supplier_name} className="border-t border-border">
                        <td className="p-2">{s.supplier_name || '—'}</td>
                        <td className="p-2 text-right">{s.positions}</td>
                        <td className="p-2 text-right">{s.qty}</td>
                        <td className="p-2 text-right whitespace-nowrap">{money(s.buy)}</td>
                        <td className="p-2 text-right whitespace-nowrap">{money(s.sale)}</td>
                        <td className="p-2 text-right">{s.avg_days ? `${Number(s.avg_days).toFixed(1)} дн.` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="grid gap-4 md:grid-cols-3">
            <section className="border border-border rounded-sm p-3">
              <h3 className="font-head uppercase text-sm mb-2">Чаще всего ищете</h3>
              {d.top_search.length === 0 && <p className="text-sm text-muted-foreground">Пока нет поисков.</p>}
              {d.top_search.map((s) => (
                <div key={s.query} className="flex justify-between text-sm py-0.5">
                  <span>{s.query}</span>
                  <span className="text-muted-foreground">{s.cnt}×</span>
                </div>
              ))}
            </section>
            <section className="border border-border rounded-sm p-3">
              <h3 className="font-head uppercase text-sm mb-2">Не нашлось ни у одного поставщика</h3>
              {d.not_found.length === 0 && <p className="text-sm text-muted-foreground">Все остальные детали нашлись.</p>}
              {d.not_found.map((s) => (
                <div key={s.query} className="flex justify-between text-sm py-0.5">
                  <span>{s.query}</span>
                  <span className="text-muted-foreground">{s.cnt}×</span>
                </div>
              ))}
            </section>
            <section className="border border-border rounded-sm p-3">
              <h3 className="font-head uppercase text-sm mb-2">Лучшие позиции по продажам</h3>
              {d.top_items.length === 0 && <p className="text-sm text-muted-foreground">Нет заказов за период.</p>}
              {d.top_items.map((s) => (
                <div key={s.article + s.brand} className="flex justify-between text-sm py-0.5">
                  <span>
                    {s.article} <span className="text-xs text-muted-foreground">{s.brand}</span>
                  </span>
                  <span className="text-muted-foreground">{money(s.sale)}</span>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsTab;
