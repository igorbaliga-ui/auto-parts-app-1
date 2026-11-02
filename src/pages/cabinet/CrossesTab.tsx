import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { cabApi } from './api';

type X = { id: number; article: string; cross_article: string; cross_brand: string };

const CrossesTab = ({ url }: { url: string }) => {
  const [list, setList] = useState<X[]>([]);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const [c, setC] = useState('');
  const [b, setB] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    async (query = '') => {
      const d = await cabApi<{ crosses: X[] }>(url, 'crosses_list', { query });
      setList(d.crosses);
    },
    [url],
  );

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await cabApi(url, 'cross_add', { article: a, cross_article: c, cross_brand: b });
      setA('');
      setC('');
      setB('');
      load(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const del = async (id: number) => {
    await cabApi(url, 'cross_delete', { id });
    load(q);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Кроссы</h2>
        <p className="text-sm text-muted-foreground">Заменители артикулов. Они подмешиваются в поиск, когда включены «Похожие артикулы».</p>
      </div>
      <form onSubmit={add} className="flex flex-wrap gap-2 border border-border rounded-sm p-4">
        <Input value={a} onChange={(e) => setA(e.target.value)} placeholder="Артикул" className="w-44" />
        <Input value={c} onChange={(e) => setC(e.target.value)} placeholder="Заменитель" className="w-44" />
        <Input value={b} onChange={(e) => setB(e.target.value)} placeholder="Бренд заменителя" className="w-44" />
        <Button type="submit">Добавить</Button>
        {error && <span className="text-sm text-destructive self-center">{error}</span>}
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="flex gap-2 max-w-xs"
      >
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти артикул" />
        <Button type="submit" variant="outline">
          <Icon name="Search" size={14} />
        </Button>
      </form>
      {list.length === 0 ? (
        <p className="text-muted-foreground">Кроссов пока нет.</p>
      ) : (
        <div className="border border-border rounded-sm divide-y divide-border">
          {list.map((x) => (
            <div key={x.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="font-medium">{x.article}</span>
              <Icon name="ArrowLeftRight" size={14} className="text-muted-foreground" />
              <span className="flex-1">
                {x.cross_article} <span className="text-xs text-muted-foreground">{x.cross_brand}</span>
              </span>
              <Button size="sm" variant="outline" onClick={() => del(x.id)}>
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrossesTab;
