import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { cabApi, money, Item } from './api';
import { loadSettings } from './SettingsTab';

type Props = { url: string; onCartChange: () => void; initialQuery?: string };

const ResultTable = ({ items, onAdd }: { items: Item[]; onAdd: (i: Item, qty: number) => void }) => {
  const [qty, setQty] = useState<Record<number, string>>({});
  return (
    <div className="overflow-x-auto border border-border rounded-sm">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left p-2">Артикул / бренд</th>
            <th className="text-left p-2">Наименование</th>
            <th className="text-left p-2">Поставщик / склад</th>
            <th className="text-right p-2">Срок</th>
            <th className="text-right p-2">Наличие</th>
            <th className="text-right p-2">Закупка</th>
            <th className="text-right p-2">Продажа</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-t border-border">
              <td className="p-2 whitespace-nowrap">
                <div className="font-medium">{i.article}</div>
                <div className="text-xs text-muted-foreground">{i.brand}</div>
              </td>
              <td className="p-2 max-w-[260px]">{i.name}</td>
              <td className="p-2">
                <div>{i.supplier_name}</div>
                <div className="text-xs text-muted-foreground">{i.warehouse}</div>
              </td>
              <td className="p-2 text-right whitespace-nowrap">{i.delivery_days != null ? `${i.delivery_days} дн.` : '—'}</td>
              <td className="p-2 text-right">{i.qty} шт.</td>
              <td className="p-2 text-right whitespace-nowrap text-muted-foreground">{money(i.price)}</td>
              <td className="p-2 text-right whitespace-nowrap font-medium">{money(i.sale)}</td>
              <td className="p-2">
                <div className="flex items-center gap-1 justify-end">
                  <Input
                    type="number"
                    min={1}
                    value={qty[i.id] ?? '1'}
                    onChange={(e) => setQty({ ...qty, [i.id]: e.target.value })}
                    className="w-16 h-8"
                  />
                  <Button size="sm" onClick={() => onAdd(i, Math.max(1, Number(qty[i.id] || 1)))}>
                    <Icon name="ShoppingCart" size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SearchTab = ({ url, onCartChange, initialQuery }: Props) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [analogs, setAnalogs] = useState(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [partial, setPartial] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');

  const [pageSize, setPageSize] = useState(50);
  const [hideEmpty, setHideEmpty] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setPageSize(Number(s.pageSize) || 50);
    setHideEmpty(s.hideEmpty);
    setAnalogs(s.analogs);
    if (initialQuery && initialQuery.length >= 3) search(undefined, initialQuery, s.analogs);
  }, []);

  const search = async (e?: React.FormEvent, q?: string, an?: boolean) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const d = await cabApi<{ items: Item[]; partial: Item[] }>(url, 'search', { query: q ?? query, with_partial: an ?? analogs });
      const keep = (i: Item) => !hideEmpty || i.qty > 0;
      setItems(d.items.filter(keep).slice(0, pageSize));
      setPartial(d.partial.filter(keep).slice(0, pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const add = async (i: Item, qty: number) => {
    await cabApi(url, 'cart_add', {
      article: i.article, brand: i.brand, name: i.name, supplier_id: i.supplier_id, supplier_name: i.supplier_name,
      delivery_days: i.delivery_days, price_buy: i.price, price_sale: i.sale, qty,
    });
    setAdded(`${i.article} добавлен в корзину`);
    setTimeout(() => setAdded(''), 2000);
    onCartChange();
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-head uppercase tracking-wide text-xl">Поиск запчастей</h2>
      <form onSubmit={search} className="flex flex-wrap items-center gap-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Артикул, например SC16HR11" className="max-w-xs" />
        <Button type="submit" disabled={loading || query.trim().length < 3}>
          <Icon name="Search" size={14} className="mr-1.5" />
          {loading ? 'Ищу...' : 'Поиск'}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={analogs} onCheckedChange={(v) => setAnalogs(v === true)} />
          Похожие артикулы
        </label>
        {added && <span className="text-sm text-emerald-500">{added}</span>}
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items && (
        <>
          <h3 className="text-sm text-muted-foreground">Точное совпадение: {items.length}</h3>
          {items.length ? <ResultTable items={items} onAdd={add} /> : <p className="text-sm text-muted-foreground">По этому артикулу ничего нет. Проверьте, что в разделе «Поставщики» загружены прайсы.</p>}
          {partial.length > 0 && (
            <>
              <h3 className="text-sm text-muted-foreground">Похожие артикулы: {partial.length}</h3>
              <ResultTable items={partial} onAdd={add} />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SearchTab;
