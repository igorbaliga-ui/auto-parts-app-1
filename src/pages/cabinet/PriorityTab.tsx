import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cabApi } from './api';

const PriorityTab = ({ url }: { url: string }) => {
  const [catalog, setCatalog] = useState<string[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    cabApi<{ brands: string[] }>(url, 'priority_get').then((d) => setChosen(d.brands));
  }, [url]);

  useEffect(() => {
    const t = setTimeout(() => {
      cabApi<{ brands: string[] }>(url, 'brands_list', { query: q }).then((d) => setCatalog(d.brands));
    }, 250);
    return () => clearTimeout(t);
  }, [url, q]);

  const move = (i: number, dir: number) =>
    setChosen((arr) => {
      const n = [...arr];
      const j = i + dir;
      if (j < 0 || j >= n.length) return arr;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const save = async () => {
    await cabApi(url, 'priority_save', { brands: chosen });
    setMsg('Сохранено');
    setTimeout(() => setMsg(''), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Приоритетные бренды</h2>
        <p className="text-sm text-muted-foreground">Бренды из списка поднимаются выше остальных в результатах поиска. Чем выше бренд, тем выше его приоритет.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-border rounded-sm p-3 flex flex-col gap-2">
          <h3 className="text-sm font-head uppercase">Бренды из ваших прайсов</h3>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по брендам" />
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {catalog.length === 0 && <p className="text-sm text-muted-foreground p-2">Брендов нет. Загрузите прайсы поставщиков.</p>}
            {catalog.map((b) => (
              <div key={b} className="flex items-center justify-between py-1.5 text-sm">
                {b}
                <Button size="sm" variant="outline" disabled={chosen.includes(b.toUpperCase())} onClick={() => setChosen((a) => [...a, b.toUpperCase()])}>
                  Добавить
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-border rounded-sm p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-head uppercase">Порядок приоритета ({chosen.length})</h3>
            <div className="flex gap-2 items-center">
              {msg && <span className="text-sm text-emerald-500">{msg}</span>}
              <Button size="sm" variant="outline" onClick={() => setChosen([])}>
                Очистить
              </Button>
              <Button size="sm" onClick={save}>
                Сохранить
              </Button>
            </div>
          </div>
          {chosen.length === 0 && <p className="text-sm text-muted-foreground p-2">Список пуст.</p>}
          {chosen.map((b, i) => (
            <div key={b} className="flex items-center gap-2 text-sm border border-border rounded-sm px-2 py-1.5">
              <span className="w-5 text-muted-foreground">{i + 1}</span>
              <span className="flex-1">{b}</span>
              <button onClick={() => move(i, -1)} className="p-1 hover:text-primary">
                <Icon name="ChevronUp" size={14} />
              </button>
              <button onClick={() => move(i, 1)} className="p-1 hover:text-primary">
                <Icon name="ChevronDown" size={14} />
              </button>
              <button onClick={() => setChosen((a) => a.filter((x) => x !== b))} className="p-1 hover:text-destructive">
                <Icon name="X" size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriorityTab;
