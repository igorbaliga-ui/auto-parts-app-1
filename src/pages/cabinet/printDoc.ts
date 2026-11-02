import { money, orderStatuses } from './api';

export type OrderFull = {
  id: number;
  client_name: string | null;
  client_phone: string | null;
  car: string | null;
  comment: string | null;
  status: string;
  total_sale: string;
  created_at: string;
  items: { id: number; article: string; brand: string; name: string; qty: number; price_sale: string; delivery_days: number | null }[];
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export const printOrderDoc = (o: OrderFull, kind: 'invoice' | 'waybill') => {
  const title = kind === 'invoice' ? `Счёт на оплату № ${o.id}` : `Расходная накладная № ${o.id}`;
  const date = new Date(o.created_at.endsWith('Z') ? o.created_at : `${o.created_at}Z`).toLocaleDateString('ru-RU');
  const rowsHtml = o.items
    .map(
      (i, n) =>
        `<tr><td>${n + 1}</td><td>${esc(i.article)}</td><td>${esc(i.brand)}</td><td>${esc(i.name)}</td><td class="r">${i.qty}</td><td class="r">${money(i.price_sale)}</td><td class="r">${money(Number(i.price_sale) * i.qty)}</td></tr>`,
    )
    .join('');
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title><style>
body{font-family:Arial,sans-serif;font-size:13px;color:#111;padding:24px}
h1{font-size:18px;margin:0 0 6px}table{border-collapse:collapse;width:100%;margin-top:14px}
th,td{border:1px solid #888;padding:5px 7px;text-align:left}th{background:#eee}.r{text-align:right}
.meta{margin:2px 0}.total{text-align:right;font-weight:bold;font-size:15px;margin-top:12px}
.sign{margin-top:40px;display:flex;justify-content:space-between}</style></head><body>
<h1>${title}</h1><div class="meta">Дата: ${date}</div>
<div class="meta">Клиент: ${esc(o.client_name || '—')} ${esc(o.client_phone || '')}</div>
${o.car ? `<div class="meta">Авто: ${esc(o.car)}</div>` : ''}
<table><thead><tr><th>№</th><th>Артикул</th><th>Бренд</th><th>Наименование</th><th class="r">Кол-во</th><th class="r">Цена</th><th class="r">Сумма</th></tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="total">Итого: ${money(o.total_sale)}</div>
${kind === 'waybill' ? '<div class="sign"><span>Отпустил: ____________</span><span>Получил: ____________</span></div>' : ''}
<script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
};

export { orderStatuses };
