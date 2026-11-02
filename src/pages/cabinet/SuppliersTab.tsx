import { useCallback, useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Icon from '@/components/ui/icon';
import { cabApi, fmtDate } from './api';

type Upload = { id: number; rows_count: number; created_at: string; supplier_name: string };
type Supplier = { id: number; name: string; kind: string; api_url: string | null; note: string | null; order_settings?: Record<string, string>; active: boolean; items_count: number; price_updated_at: string | null };

const kindLabel: Record<string, string> = { file: 'Прайс-лист', api: 'API', email: 'Почта' };
const FIELDS: [string, string][] = [
  ['article', 'Артикул *'],
  ['brand', 'Бренд'],
  ['name', 'Наименование'],
  ['price', 'Цена *'],
  ['qty', 'Остаток'],
  ['delivery_days', 'Срок, дн.'],
  ['warehouse', 'Склад'],
];
const GUESS: Record<string, RegExp> = {
  article: /артикул|article|код|номер/i,
  brand: /бренд|brand|произв/i,
  name: /наимен|name|описан|товар/i,
  price: /цена|price/i,
  qty: /остат|налич|qty|кол/i,
  delivery_days: /срок|дн|delivery/i,
  warehouse: /склад|warehouse/i,
};
const CHUNK = 3000;

const orderFields: [string, string, string][] = [
  ['payment_type', 'Способ оплаты', '1 — наличный, 2 — безналичный'],
  ['delivery_type', 'Тип доставки', '1 — обычная, 2 — авиадоставка'],
  ['dispatch_type', 'Способ доставки', '2 — самовывоз, 3 — доставка, 60580 — срочная'],
  ['shipment_address', 'Адрес доставки', 'Код адреса из личного кабинета Берг'],
  ['comment', 'Комментарий к заказу', 'Например, название вашей компании'],
];

type Parsed = { head: string[]; rows: string[][] };

const SuppliersTab = ({ url }: { url: string }) => {
  const [list, setList] = useState<Supplier[]>([]);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('file');
  const [apiUrl, setApiUrl] = useState('');
  const [error, setError] = useState('');
  const [uploadFor, setUploadFor] = useState<Supplier | null>(null);
  const [orderFor, setOrderFor] = useState<Supplier | null>(null);
  const [orderVals, setOrderVals] = useState<Record<string, string>>({});
  const [orderMsg, setOrderMsg] = useState('');
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [map, setMap] = useState<Record<string, number>>({});
  const [replace, setReplace] = useState(true);
  const [progress, setProgress] = useState('');
  const [uploads, setUploads] = useState<Upload[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const d = await cabApi<{ suppliers: Supplier[] }>(url, 'suppliers_list');
    setList(d.suppliers);
    const u = await cabApi<{ uploads: Upload[] }>(url, 'uploads_list');
    setUploads(u.uploads);
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await cabApi(url, 'supplier_save', { name, kind, api_url: apiUrl });
      setName('');
      setApiUrl('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    }
  };

  const toggle = async (s: Supplier, active: boolean) => {
    await cabApi(url, 'supplier_toggle', { id: s.id, active });
    setList((arr) => arr.map((x) => (x.id === s.id ? { ...x, active } : x)));
  };

  const remove = async (s: Supplier) => {
    await cabApi(url, 'supplier_delete', { id: s.id });
    if (uploadFor?.id === s.id) setUploadFor(null);
    load();
  };

  const onFile = async (f: File) => {
    setError('');
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      const all = data.map((r) => (r as unknown[]).map((c) => String(c ?? '').trim())).filter((r) => r.some(Boolean));
      if (all.length < 2) throw new Error('В файле нет данных');
      const head = all[0];
      const m: Record<string, number> = {};
      FIELDS.forEach(([key]) => {
        const idx = head.findIndex((h, i) => GUESS[key].test(h) && !Object.values(m).includes(i));
        if (idx >= 0) m[key] = idx;
      });
      setParsed({ head, rows: all.slice(1) });
      setMap(m);
    } catch (err) {
      setParsed(null);
      setError(err instanceof Error ? err.message : 'Не удалось прочитать файл');
    }
  };

  const upload = async () => {
    if (!uploadFor || !parsed) return;
    if (map.article == null || map.price == null) {
      setError('Укажите колонки «Артикул» и «Цена»');
      return;
    }
    setError('');
    const rows = parsed.rows.map((r) => {
      const o: Record<string, string> = {};
      FIELDS.forEach(([key]) => {
        if (map[key] != null) o[key] = r[map[key]] ?? '';
      });
      return o;
    });
    try {
      for (let i = 0; i < rows.length; i += CHUNK) {
        setProgress(`Загружено ${Math.min(i, rows.length)} из ${rows.length}`);
        await cabApi(url, 'price_upload', { supplier_id: uploadFor.id, rows: rows.slice(i, i + CHUNK), replace: replace && i === 0 });
      }
      setProgress(`Готово: загружено ${rows.length} позиций`);
      setParsed(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      setProgress('');
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    }
  };

  const saveOrderSettings = async () => {
    if (!orderFor) return;
    await cabApi(url, 'supplier_save', { id: orderFor.id, name: orderFor.name, kind: orderFor.kind, order_settings: orderVals });
    setOrderMsg('Сохранено');
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-head uppercase tracking-wide text-xl">Поставщики и прайсы</h2>
      <form onSubmit={add} className="flex flex-wrap gap-2 border border-border rounded-sm p-4">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название поставщика" className="max-w-xs" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 rounded-sm border border-input bg-background px-3 text-sm">
          <option value="file">Прайс-лист</option>
          <option value="api">API (адрес сохраняется для будущего подключения)</option>
        </select>
        {kind === 'api' && <Input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="Адрес API" className="max-w-xs" />}
        <Button type="submit">
          <Icon name="Plus" size={14} className="mr-1.5" />
          Добавить
        </Button>
      </form>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {list.length === 0 ? (
        <p className="text-muted-foreground">Поставщиков пока нет.</p>
      ) : (
        <div className="border border-border rounded-sm divide-y divide-border">
          {list.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
              <Switch checked={s.active} onCheckedChange={(v) => toggle(s, v)} />
              <div className="flex-1 min-w-[180px]">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {kindLabel[s.kind]} · {s.items_count} поз.{s.price_updated_at ? ` · обновлён ${fmtDate(s.price_updated_at)}` : ''}
                </div>
              </div>
              <span className={`text-xs ${s.active ? 'text-emerald-500' : 'text-muted-foreground'}`}>{s.active ? 'Участвует в поиске' : 'Выключен'}</span>
              {s.kind === 'api' && (
                <Button size="sm" variant="outline" onClick={() => { setOrderFor(s); setOrderVals(s.order_settings || {}); setOrderMsg(''); }}>
                  <Icon name="Settings" size={14} className="mr-1.5" />
                  Настройки заказа
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => { setUploadFor(s); setParsed(null); setProgress(''); }}>
                <Icon name="Upload" size={14} className="mr-1.5" />
                Загрузить прайс
              </Button>
              <Button size="sm" variant="outline" onClick={() => remove(s)}>
                <Icon name="Trash2" size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      {uploads.length > 0 && (
        <section>
          <h3 className="font-head uppercase text-sm mb-2">История загрузок прайсов</h3>
          <div className="border border-border rounded-sm divide-y divide-border">
            {uploads.map((u) => (
              <div key={u.id} className="flex justify-between gap-3 p-2.5 text-sm">
                <span>{u.supplier_name}</span>
                <span className="text-muted-foreground">
                  {fmtDate(u.created_at)} · {u.rows_count} поз.
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      {orderFor && (
        <div className="border border-border rounded-sm p-4 flex flex-col gap-3">
          <h3 className="font-head uppercase tracking-wide">Настройки заказа: {orderFor.name}</h3>
          <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
            {orderFields.map(([key, label, hint]) => (
              <label key={key} className="text-xs text-muted-foreground flex flex-col gap-1">
                {label}
                <Input value={orderVals[key] || ''} onChange={(e) => { setOrderVals({ ...orderVals, [key]: e.target.value }); setOrderMsg(''); }} />
                <span>{hint}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={saveOrderSettings}>Сохранить</Button>
            <Button variant="outline" onClick={() => setOrderFor(null)}>Закрыть</Button>
            {orderMsg && <span className="text-sm text-emerald-500">{orderMsg}</span>}
          </div>
        </div>
      )}
      {uploadFor && (
        <div className="border border-border rounded-sm p-4 flex flex-col gap-3">
          <h3 className="font-head uppercase tracking-wide">Прайс: {uploadFor.name}</h3>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" />
          {parsed && (
            <>
              <p className="text-sm text-muted-foreground">Найдено строк: {parsed.rows.length}. Проверьте, какие колонки что означают.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {FIELDS.map(([key, label]) => (
                  <label key={key} className="text-xs text-muted-foreground flex flex-col gap-1">
                    {label}
                    <select
                      value={map[key] ?? ''}
                      onChange={(e) => setMap({ ...map, [key]: e.target.value === '' ? (undefined as unknown as number) : Number(e.target.value) })}
                      className="h-9 rounded-sm border border-input bg-background px-2 text-sm text-foreground"
                    >
                      <option value="">— не загружать —</option>
                      {parsed.head.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Заменить прежний прайс этого поставщика
              </label>
              <Button onClick={upload} className="self-start">
                Загрузить {parsed.rows.length} позиций
              </Button>
            </>
          )}
          {progress && <p className="text-sm text-emerald-500">{progress}</p>}
        </div>
      )}
    </div>
  );
};

export default SuppliersTab;
