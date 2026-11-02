import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cabApi, money } from './api';

type Row = { article: string; brand: string; qty: string | number | null; offers: number; name?: string; supplier_name?: string; price?: number | null; sale?: number | null; stock?: number | null; days?: number | null };

const parseLines = (text: string) =>
  text
    .split('\n')
    .map((l) => l.split(/[\t;,]/).map((c) => c.trim()))
    .filter((c) => c[0])
    .map((c) => ({ article: c[0], brand: c[1] || '', qty: c[2] || '' }));

const BulkTab = ({ url }: { url: string }) => {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onFile = async (f: File) => {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    setText(data.map((r) => (r as unknown[]).slice(0, 3).join('\t')).join('\n'));
  };

  const run = async () => {
    setLoading(true);
    setError('');
    try {
      const d = await cabApi<{ rows: Row[] }>(url, 'bulk_check', { rows: parseLines(text) });
      setRows(d.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const exportXlsx = () => {
    if (!rows) return;
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({ Артикул: r.article, Бренд: r.brand, Количество: r.qty, Предложений: r.offers, Наименование: r.name, Поставщик: r.supplier_name, Закупка: r.price, Продажа: r.sale, Остаток: r.stock, 'Срок, дн.': r.days })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Проценка');
    XLSX.writeFile(wb, 'procenka.xlsx');
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-head uppercase tracking-wide text-xl">Анализ цен</h2>
        <p className="text-sm text-muted-foreground">Массовая проценка по артикулу. Вставьте строки «Артикул, Бренд, Количество» или загрузите Excel / CSV.</p>
      </div>
      <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="text-sm" />
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={'603001\tTRW\t2\nSC16HR11'} className="max-w-2xl font-mono" />
      <div className="flex gap-2 items-center">
        <Button onClick={run} disabled={loading || !text.trim()}>
          {loading ? 'Считаю...' : 'Проценка'}
        </Button>
        {rows && (
          <Button variant="outline" onClick={exportXlsx}>
            Скачать Excel
          </Button>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
      {rows && (
        <div className="overflow-x-auto border border-border rounded-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Артикул</th>
                <th className="text-left p-2">Бренд</th>
                <th className="text-right p-2">Кол-во</th>
                <th className="text-left p-2">Лучшее предложение</th>
                <th className="text-right p-2">Закупка</th>
                <th className="text-right p-2">Продажа</th>
                <th className="text-right p-2">Срок</th>
                <th className="text-right p-2">Предл.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-2">{r.article}</td>
                  <td className="p-2">{r.brand}</td>
                  <td className="p-2 text-right">{r.qty}</td>
                  <td className="p-2">{r.offers ? `${r.supplier_name} · ${r.name || ''}` : <span className="text-destructive">не найдено</span>}</td>
                  <td className="p-2 text-right whitespace-nowrap">{r.price != null ? money(r.price) : '—'}</td>
                  <td className="p-2 text-right whitespace-nowrap">{r.sale != null ? money(r.sale) : '—'}</td>
                  <td className="p-2 text-right">{r.days != null ? `${r.days} дн.` : '—'}</td>
                  <td className="p-2 text-right">{r.offers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BulkTab;
