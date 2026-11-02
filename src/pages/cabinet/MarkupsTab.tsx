import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cabApi } from './api';

type Row = { price_from: string; percent: string; rounding: string };

const MarkupsTab = ({ url }: { url: string }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    cabApi<{ markups: { price_from: string; percent: string; rounding: number }[] }>(url, 'markups_get').then((d) =>
      setRows(d.markups.map((m) => ({ price_from: String(Number(m.price_from)), percent: String(Number(m.percent)), rounding: String(m.rounding) }))),
    );
  }, [url]);

  const patch = (i: number, p: Partial<Row>) => setRows((arr) => arr.map((r, n) => (n === i ? { ...r, ...p } : r)));

  const save = async () => {
    await cabApi(url, 'markups_save', { markups: rows });
    setMsg('Сохранено');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Наценки</h2>
        <p className="text-sm text-muted-foreground">Цена продажи считается от закупочной по диапазону: берётся строка с наибольшим значением «Цена от», не превышающим закупку.</p>
      </div>
      <div className="border border-border rounded-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 p-2 text-xs uppercase text-muted-foreground">
          <span>Цена от, ₽</span>
          <span>Наценка, %</span>
          <span>Округление до, ₽</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_40px] gap-2 p-2 border-t border-border">
            <Input type="number" value={r.price_from} onChange={(e) => patch(i, { price_from: e.target.value })} />
            <Input type="number" value={r.percent} onChange={(e) => patch(i, { percent: e.target.value })} />
            <Input type="number" min={1} value={r.rounding} onChange={(e) => patch(i, { rounding: e.target.value })} />
            <Button variant="ghost" size="icon" onClick={() => setRows((arr) => arr.filter((_, n) => n !== i))}>
              <Icon name="X" size={14} />
            </Button>
          </div>
        ))}
        {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">Наценок нет: продажа равна закупке.</p>}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setRows((a) => [...a, { price_from: '0', percent: '20', rounding: '1' }])}>
          <Icon name="Plus" size={14} className="mr-1.5" />
          Добавить диапазон
        </Button>
        <Button onClick={save}>Сохранить</Button>
        {msg && <span className="text-sm text-emerald-500">{msg}</span>}
      </div>
    </div>
  );
};

export default MarkupsTab;
