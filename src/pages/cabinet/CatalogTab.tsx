import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Icon from '@/components/ui/icon';
import { safeGetSession } from '@/lib/storage';
import funcs from '../../../backend/func2url.json';

const URL_AI = (funcs as Record<string, string>)['lead-ai-articles'] || '';

type Make = { id: number; name: string };
type Model = { id: number; name: string; from: number | null; to: number | null };
type Mod = { id: number; name: string; from: number | null; to: number | null; engine_code: string; engine_type: string; power: string; capacity: string; drive: string; body: string };
type Node = { id: number; name: string; parent: number };
type Part = { brand: string; number: string; name: string };
type Oem = Part & { fit: string };

const call = async <T,>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
  const res = await fetch(URL_AI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Password': safeGetSession('admin_password') || '' },
    body: JSON.stringify({ action, ...payload }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error || 'Ошибка запроса');
  return d as T;
};

const years = (a: number | null, b: number | null) => (a ? `${a}–${b ?? '…'}` : '');

const NodeBranch = ({ node, kids, depth, open, toggle, pick, active }: { node: Node; kids: Record<number, Node[]>; depth: number; open: Record<number, boolean>; toggle: (id: number) => void; pick: (n: Node) => void; active: number | null }) => {
  const children = kids[node.id] || [];
  const isOpen = open[node.id];
  return (
    <div>
      <button
        type="button"
        onClick={() => (children.length ? toggle(node.id) : pick(node))}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={`w-full flex items-center gap-1.5 text-left text-sm py-1.5 pr-2 hover:bg-muted/40 ${active === node.id ? 'bg-primary/15' : ''}`}
      >
        {children.length ? <Icon name={isOpen ? 'ChevronDown' : 'ChevronRight'} size={14} /> : <span className="w-3.5" />}
        <span>{node.name}</span>
      </button>
      {isOpen && children.map((c) => <NodeBranch key={c.id} node={c} kids={kids} depth={depth + 1} open={open} toggle={toggle} pick={pick} active={active} />)}
    </div>
  );
};

const CatalogTab = ({ onSearch }: { onSearch: (q: string) => void }) => {
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [mod, setMod] = useState<Mod | null>(null);
  const [nodeFilter, setNodeFilter] = useState('');
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [node, setNode] = useState<Node | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [oem, setOem] = useState<Oem[]>([]);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');

  const run = async <T,>(label: string, fn: () => Promise<T>): Promise<T | null> => {
    setLoading(label);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      return null;
    } finally {
      setLoading('');
    }
  };

  useEffect(() => {
    run('марки', () => call<{ items: Make[] }>('catalog_makes')).then((d) => d && setMakes(d.items));
  }, []);

  const onMake = async (id: string) => {
    setMakeId(id);
    setModelId('');
    setModels([]);
    setMods([]);
    setMod(null);
    setNodes([]);
    setNode(null);
    if (!id) return;
    const d = await run('модели', () => call<{ items: Model[] }>('catalog_models', { id: Number(id) }));
    if (d) setModels(d.items);
  };

  const onModel = async (id: string) => {
    setModelId(id);
    setMods([]);
    setMod(null);
    setNodes([]);
    setNode(null);
    if (!id) return;
    const d = await run('модификации', () => call<{ items: Mod[] }>('catalog_mods', { id: Number(id) }));
    if (d) setMods(d.items);
  };

  const onMod = async (id: string) => {
    const m = mods.find((x) => String(x.id) === id) || null;
    setMod(m);
    setNodes([]);
    setNode(null);
    setParts([]);
    setOem([]);
    setOpen({});
    setNodeFilter('');
    if (!m) return;
    const d = await run('узлы', () => call<{ items: Node[] }>('catalog_tree', { id: m.id }));
    if (d) setNodes(d.items);
  };

  const pick = async (n: Node) => {
    if (!mod) return;
    setNode(n);
    setParts([]);
    setOem([]);
    const d = await run('детали', () => call<{ parts: Part[]; oem: Oem[] }>('catalog_parts', { modi: mod.id, nodei: n.id, with_oem: true }));
    if (d) {
      setParts(d.parts);
      setOem(d.oem);
    }
  };

  const { kids, roots } = useMemo(() => {
    const k: Record<number, Node[]> = {};
    const ids = new Set(nodes.map((n) => n.id));
    const r: Node[] = [];
    for (const n of nodes) {
      if (n.parent && ids.has(n.parent)) (k[n.parent] ||= []).push(n);
      else r.push(n);
    }
    return { kids: k, roots: r };
  }, [nodes]);

  const flat = useMemo(() => {
    const q = nodeFilter.trim().toLowerCase();
    if (!q) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const hasKids = new Set(nodes.map((n) => n.parent));
    return nodes
      .filter((n) => !hasKids.has(n.id) && n.name.toLowerCase().includes(q))
      .slice(0, 60)
      .map((n) => {
        const path: string[] = [];
        let cur: Node | undefined = n;
        let guard = 0;
        while (cur && guard < 8) {
          path.unshift(cur.name);
          cur = byId.get(cur.parent);
          guard++;
        }
        return { node: n, path: path.join(' › ') };
      });
  }, [nodeFilter, nodes]);

  const toggle = (id: number) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const sel = 'h-10 rounded-sm border border-input bg-background px-3 text-sm';

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Каталог по автомобилю</h2>
        <p className="text-sm text-muted-foreground">Выберите марку, модель и модификацию, затем узел: покажем детали и оригинальные номера. Схем с картинками в каталоге FAPI нет, только дерево узлов.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={makeId} onChange={(e) => onMake(e.target.value)} className={sel}>
          <option value="">Марка</option>
          {makes.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select value={modelId} onChange={(e) => onModel(e.target.value)} disabled={!models.length} className={sel}>
          <option value="">Модель</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name} {years(m.from, m.to)}</option>
          ))}
        </select>
        <select value={mod ? String(mod.id) : ''} onChange={(e) => onMod(e.target.value)} disabled={!mods.length} className={sel}>
          <option value="">Модификация</option>
          {mods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.engine_code ? `· ${m.engine_code}` : ''} {m.power ? `· ${m.power}` : ''} {years(m.from, m.to)}
            </option>
          ))}
        </select>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Загружаю: {loading}...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {mod && nodes.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            <Input value={nodeFilter} onChange={(e) => setNodeFilter(e.target.value)} placeholder="Поиск узла, например: колодки" />
            <div className="border border-border rounded-sm max-h-[520px] overflow-y-auto">
              {nodeFilter.trim() ? (
                flat.length ? (
                  flat.map((f) => (
                    <button key={f.node.id} type="button" onClick={() => pick(f.node)} className={`w-full text-left text-sm p-2 border-b border-border hover:bg-muted/40 ${node?.id === f.node.id ? 'bg-primary/15' : ''}`}>
                      {f.path}
                    </button>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">Ничего не найдено</p>
                )
              ) : (
                roots.map((r) => <NodeBranch key={r.id} node={r} kids={kids} depth={0} open={open} toggle={toggle} pick={pick} active={node?.id ?? null} />)
              )}
            </div>
          </div>
          <div className="flex flex-col gap-4 min-w-0">
            {!node && <p className="text-sm text-muted-foreground">Выберите узел слева.</p>}
            {node && (
              <>
                <h3 className="font-head uppercase tracking-wide">{node.name}</h3>
                <section className="flex flex-col gap-2">
                  <h4 className="text-sm text-muted-foreground">Оригинальные номера: {oem.length}</h4>
                  {oem.length === 0 && !loading && <p className="text-sm text-muted-foreground">Для этого узла оригинальных номеров нет.</p>}
                  {oem.length > 0 && (
                    <div className="border border-border rounded-sm divide-y divide-border max-h-[300px] overflow-y-auto">
                      {oem.map((o, i) => (
                        <div key={`${o.brand}-${o.number}-${i}`} className="flex items-center justify-between gap-3 p-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-head tracking-[0.1em]">{o.number}</span> <span className="text-xs text-muted-foreground">{o.brand}</span>
                            <div className="text-xs text-muted-foreground truncate">{o.name}{o.fit ? ` · ${o.fit}` : ''}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onSearch(o.number)}>Цены</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="flex flex-col gap-2">
                  <h4 className="text-sm text-muted-foreground">Детали узла: {parts.length}</h4>
                  {parts.length > 0 && (
                    <div className="border border-border rounded-sm divide-y divide-border max-h-[360px] overflow-y-auto">
                      {parts.map((p, i) => (
                        <div key={`${p.brand}-${p.number}-${i}`} className="flex items-center justify-between gap-3 p-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-head tracking-[0.1em]">{p.number}</span> <span className="text-xs text-muted-foreground">{p.brand}</span>
                            <div className="text-xs text-muted-foreground truncate">{p.name}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => onSearch(p.number)}>Цены</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogTab;
