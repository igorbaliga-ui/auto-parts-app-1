import { Fragment, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cabApi, money, Item } from './api';
import { loadSettings } from './SettingsTab';

type Props = { url: string; onCartChange: () => void; initialQuery?: string; articles?: string[]; clientName?: string };

const PAGE = 5;

type Group = { article: string; items: Item[]; partial: Item[] };

const ResultTable = ({ items, onAdd }: { items: Item[]; onAdd: (i: Item, qty: number) => void }) => {
  const [qty, setQty] = useState<Record<number, string>>({});
  const [shown, setShown] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const brands: string[] = [];
  const byBrand: Record<string, Item[]> = {};
  for (const i of items) {
    const b = i.brand || '—';
    if (!byBrand[b]) {
      byBrand[b] = [];
      brands.push(b);
    }
    byBrand[b].push(i);
  }
  return (
    <div className="bg-card border border-steel rounded-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Артикул / бренд</TableHead>
            <TableHead>Наименование</TableHead>
            <TableHead>Поставщик / склад</TableHead>
            <TableHead className="text-right">Срок</TableHead>
            <TableHead className="text-right">Наличие</TableHead>
            <TableHead className="text-right">Закупка</TableHead>
            <TableHead className="text-right">Продажа</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {brands.map((b) => {
            const list = byBrand[b];
            const limit = collapsed[b] ? 0 : shown[b] ?? PAGE;
            return (
              <Fragment key={b}>
                {brands.length > 1 && (
                  <TableRow
                    className="bg-primary/15 hover:bg-primary/20 border-t-2 border-primary/50 cursor-pointer select-none"
                    onClick={() => setCollapsed({ ...collapsed, [b]: !collapsed[b] })}
                  >
                    <TableCell colSpan={8} className="py-2 font-head uppercase tracking-wide text-xs text-foreground border-l-4 border-primary">
                      <span className="inline-flex items-center gap-2">
                        <Icon name={collapsed[b] ? 'ChevronRight' : 'ChevronDown'} size={14} />
                        {b} <span className="text-muted-foreground">({list.length})</span>
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {list.slice(0, limit).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className={`whitespace-nowrap ${brands.length > 1 ? "border-l-4 border-primary/40" : ""}`}>
                      <div className="font-head tracking-[0.1em]">{i.article}</div>
                      <div className="text-xs text-muted-foreground">{i.brand}</div>
                    </TableCell>
                    <TableCell className="max-w-[260px] text-muted-foreground">{i.name}</TableCell>
                    <TableCell>
                      <div>{i.supplier_name}</div>
                      <div className="text-xs text-muted-foreground">{i.warehouse}</div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">{i.delivery_days != null ? `${i.delivery_days} дн.` : '—'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{i.qty} шт.</TableCell>
                    <TableCell className="text-right whitespace-nowrap text-muted-foreground">{money(i.price)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap font-head">{money(i.sale)}</TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
                {!collapsed[b] && list.length > limit && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={8} className={`text-center py-2 ${brands.length > 1 ? "border-l-4 border-primary/40" : ""}`}>
                      <Button variant="ghost" size="sm" onClick={() => setShown({ ...shown, [b]: limit + PAGE })}>
                        Показать ещё ({Math.min(PAGE, list.length - limit)} из {list.length - limit})
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

const SearchTab = ({ url, onCartChange, initialQuery, articles, clientName }: Props) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [analogs, setAnalogs] = useState(true);
  const [items, setItems] = useState<Item[] | null>(null);
  const [partial, setPartial] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState('');
  const [warning, setWarning] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);

  const [pageSize, setPageSize] = useState(50);
  const [hideEmpty, setHideEmpty] = useState(false);

  useEffect(() => {
    const s = loadSettings();
    setPageSize(Number(s.pageSize) || 50);
    setHideEmpty(s.hideEmpty);
    setAnalogs(s.analogs);
    if (initialQuery && initialQuery.length >= 3) search(undefined, initialQuery, s.analogs);
    if (articles && articles.length > 0) searchMany(articles, s.analogs, s.hideEmpty, Number(s.pageSize) || 50);
  }, []);

  const searchMany = async (list: string[], an: boolean, hide: boolean, size: number) => {
    setLoading(true);
    setError('');
    try {
      const keep = (i: Item) => !hide || i.qty > 0;
      const out: Group[] = [];
      for (const a of list) {
        const d = await cabApi<{ items: Item[]; partial: Item[] }>(url, 'search', { query: a, with_partial: an });
        out.push({ article: a, items: d.items.filter(keep).slice(0, size), partial: d.partial.filter(keep).slice(0, size) });
      }
      setGroups(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const search = async (e?: React.FormEvent, q?: string, an?: boolean) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const d = await cabApi<{ items: Item[]; partial: Item[]; warning?: string | null }>(url, 'search', { query: q ?? query, with_partial: an ?? analogs });
      setWarning(d.warning || '');
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
      berg_resource_id: i.berg_resource_id, berg_warehouse_id: i.berg_warehouse_id,
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
      {clientName && <p className="text-sm text-muted-foreground">Заказ для клиента: {clientName}. Добавьте позиции в корзину и оформите заказ.</p>}
      {warning && <p className="text-sm text-amber-500">{warning}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading && groups.length === 0 && articles && articles.length > 0 && <p className="text-sm text-muted-foreground">Ищу артикулы из заявки...</p>}
      {groups.map((g) => (
        <div key={g.article} className="flex flex-col gap-2">
          <h3 className="font-head uppercase tracking-wide">{g.article}</h3>
          {g.items.length ? <ResultTable items={g.items} onAdd={add} /> : <p className="text-sm text-muted-foreground">Точных совпадений нет.</p>}
          {g.partial.length > 0 && (
            <>
              <h4 className="text-sm text-muted-foreground">Похожие артикулы: {g.partial.length}</h4>
              <ResultTable items={g.partial} onAdd={add} />
            </>
          )}
        </div>
      ))}
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
