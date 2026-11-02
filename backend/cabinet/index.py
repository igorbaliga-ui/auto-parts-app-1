import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit

CORS = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
ORDER_STATUSES = ('new', 'confirmed', 'ordered', 'shipped', 'done', 'cancelled')


def norm(s) -> str:
    return re.sub(r'[^0-9A-Za-zА-Яа-я]', '', str(s or '')).upper()


def num(v, default=0.0) -> float:
    try:
        return float(str(v).replace(' ', '').replace('\xa0', '').replace(',', '.'))
    except (ValueError, TypeError):
        return default


def ok(data, code=200):
    return {'statusCode': code, 'headers': CORS, 'body': json.dumps(data, default=str)}


def err(msg, code=400):
    return ok({'error': msg}, code)


def berg_search(article: str, with_analogs: bool):
    key = os.environ.get('BERG_API_KEY')
    if not key:
        return [], 'Ключ Берг не задан'
    params = {'items[0][resource_article]': article, 'analogs': '1' if with_analogs else '0', 'key': key}
    url = 'https://api.berg.ru/ordering/get_stock.json?' + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={'Accept': 'application/json'}), timeout=3.5) as r:
            data = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            data = json.loads(e.read().decode('utf-8'))
        except Exception:
            return [], f'Берг: ошибка {e.code}'
    except Exception as e:
        return [], f'Берг не ответил ({type(e).__name__}), показаны только прайсы'
    print('BERG', article, json.dumps(data, ensure_ascii=False)[:600])
    if isinstance(data, dict) and data.get('errors'):
        code = str((data['errors'][0] or {}).get('code') or '')
        text = str((data['errors'][0] or {}).get('text') or '')
        if code == 'ERR_API_KEY_INVALID':
            return [], 'Берг: ключ API не подошёл. Проверьте ключ в секрете BERG_API_KEY'
        return [], f'Берг: {text or code}'
    out = []
    if not (data.get('resources') if isinstance(data, dict) else None):
        return [], 'Берг: по этому артикулу ничего не найдено'
    for res in data.get('resources') or []:
        brand = (res.get('brand') or {}).get('name') or ''
        for o in res.get('offers') or []:
            try:
                price = float(o.get('price'))
                qty = int(float(o.get('quantity') or 0))
            except (TypeError, ValueError):
                continue
            days = o.get('average_period')
            out.append({
                'article': str(res.get('article') or article), 'brand': brand, 'name': res.get('name') or '',
                'price': price, 'qty': qty,
                'delivery_days': int(days) if str(days or '').isdigit() else None,
                'warehouse': (o.get('warehouse') or {}).get('name') or '',
                'berg_resource_id': str(res.get('id') or ''), 'berg_warehouse_id': str((o.get('warehouse') or {}).get('id') or ''),
                'exact': norm(res.get('article')) == norm(article),
            })
    return out, None


def berg_order(items: list, comment: str):
    key = os.environ.get('BERG_API_KEY')
    if not key:
        return None, 'Ключ Берг не задан'
    params = {'key': key}
    for n, i in enumerate(items):
        params[f'items[{n}][resource_id]'] = i['berg_resource_id']
        params[f'items[{n}][warehouse_id]'] = i['berg_warehouse_id']
        params[f'items[{n}][quantity]'] = str(i['qty'])
        if comment:
            params[f'items[{n}][comment]'] = comment[:200]
    req = urllib.request.Request('https://api.berg.ru/ordering/place_order.json', data=urllib.parse.urlencode(params).encode(), method='POST')
    try:
        with urllib.request.urlopen(req, timeout=4) as r:
            data = json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try:
            data = json.loads(e.read().decode('utf-8'))
        except Exception:
            return None, f'Берг: ошибка {e.code}'
    except Exception as e:
        return None, f'Берг не ответил ({type(e).__name__})'
    print('BERG ORDER', json.dumps(data, ensure_ascii=False)[:800])
    if isinstance(data, dict) and data.get('errors'):
        e0 = data['errors'][0] or {}
        return None, f"Берг: {e0.get('text') or e0.get('code')}"
    order = (data.get('order') if isinstance(data, dict) else None) or {}
    oid = order.get('id') or (data.get('order_id') if isinstance(data, dict) else None)
    return str(oid or 'ok'), None


def sale_price(price: float, markups: list) -> float:
    pct, rnd = 0.0, 1
    for m in markups:
        if price >= float(m['price_from']):
            pct, rnd = float(m['percent']), int(m['rounding'] or 1)
    value = price * (1 + pct / 100)
    if rnd > 1:
        value = -(-value // rnd) * rnd
    return round(value, 2)


def handler(event: dict, context) -> dict:
    """Кабинет оптовых продаж: поставщики и прайсы, поиск по артикулу с наценкой, корзина, заказы, клиенты, гараж, история поиска, данные для документов. Доступ по паролю администратора."""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }
    if method != 'POST':
        return err('Method not allowed', 405)

    dsn = os.environ['DATABASE_URL']
    s = os.environ['MAIN_DB_SCHEMA']

    if not check_rate_limit(dsn, s, get_client_ip(event), 'cabinet', max_requests=600, window_seconds=300):
        return err('Слишком много запросов. Попробуйте позже', 429)

    h = event.get('headers') or {}
    password = h.get('X-Admin-Password') or h.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    if not admin_password or password != admin_password:
        return err('Неверный пароль', 401)

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        def rows(sql, params=()):
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

        def one(sql, params=()):
            cur.execute(sql, params)
            r = cur.fetchone()
            return dict(r) if r else None

        def markups():
            return rows(f"SELECT price_from, percent, rounding FROM {s}.cab_markups ORDER BY price_from")

        if action == 'suppliers_list':
            return ok({'suppliers': rows(f"SELECT * FROM {s}.cab_suppliers ORDER BY id")})

        if action == 'supplier_save':
            name = str(body.get('name') or '').strip()
            if not name:
                return err('Укажите название поставщика')
            kind = body.get('kind') if body.get('kind') in ('file', 'api', 'email') else 'file'
            sid = body.get('id')
            if sid:
                cur.execute(
                    f"UPDATE {s}.cab_suppliers SET name=%s, kind=%s, api_url=%s, api_login=%s, note=%s WHERE id=%s",
                    (name, kind, body.get('api_url') or None, body.get('api_login') or None, body.get('note') or None, sid),
                )
            else:
                cur.execute(
                    f"INSERT INTO {s}.cab_suppliers (name, kind, api_url, api_login, note) VALUES (%s,%s,%s,%s,%s) RETURNING id",
                    (name, kind, body.get('api_url') or None, body.get('api_login') or None, body.get('note') or None),
                )
                sid = cur.fetchone()['id']
            conn.commit()
            return ok({'id': sid})

        if action == 'supplier_toggle':
            cur.execute(f"UPDATE {s}.cab_suppliers SET active = %s WHERE id = %s", (bool(body.get('active')), body.get('id')))
            conn.commit()
            return ok({'ok': True})

        if action == 'supplier_delete':
            sid = body.get('id')
            cur.execute(f"DELETE FROM {s}.cab_price_items WHERE supplier_id = %s", (sid,))
            cur.execute(f"DELETE FROM {s}.cab_suppliers WHERE id = %s", (sid,))
            conn.commit()
            return ok({'ok': True})

        if action == 'price_upload':
            sid = body.get('supplier_id')
            if not one(f"SELECT id FROM {s}.cab_suppliers WHERE id = %s", (sid,)):
                return err('Поставщик не найден', 404)
            if body.get('replace'):
                cur.execute(f"DELETE FROM {s}.cab_price_items WHERE supplier_id = %s", (sid,))
            batch = []
            for r in (body.get('rows') or [])[:5000]:
                art = str(r.get('article') or '').strip()
                if not art:
                    continue
                days = r.get('delivery_days')
                batch.append((
                    sid, art[:80], norm(art)[:80], str(r.get('brand') or '').strip()[:80],
                    str(r.get('name') or '').strip()[:300], num(r.get('price')),
                    int(num(r.get('qty'))), int(num(days)) if days not in (None, '') else None,
                    str(r.get('warehouse') or '').strip()[:80],
                ))
            if batch:
                psycopg2.extras.execute_values(
                    cur,
                    f"INSERT INTO {s}.cab_price_items (supplier_id, article, article_norm, brand, name, price, qty, delivery_days, warehouse) VALUES %s",
                    batch,
                    page_size=1000,
                )
            cur.execute(f"INSERT INTO {s}.cab_price_uploads (supplier_id, rows_count) VALUES (%s,%s)", (sid, len(batch)))
            cur.execute(
                f"UPDATE {s}.cab_suppliers SET items_count = (SELECT COUNT(*) FROM {s}.cab_price_items WHERE supplier_id = %s), price_updated_at = now() WHERE id = %s",
                (sid, sid),
            )
            conn.commit()
            return ok({'added': len(batch)})

        if action == 'uploads_list':
            return ok({'uploads': rows(
                f"SELECT u.id, u.rows_count, u.created_at, sp.name AS supplier_name FROM {s}.cab_price_uploads u "
                f"JOIN {s}.cab_suppliers sp ON sp.id = u.supplier_id ORDER BY u.id DESC LIMIT 50"
            )})

        if action == 'markups_get':
            return ok({'markups': markups()})

        if action == 'markups_save':
            cur.execute(f"DELETE FROM {s}.cab_markups")
            for m in (body.get('markups') or [])[:50]:
                cur.execute(
                    f"INSERT INTO {s}.cab_markups (price_from, percent, rounding) VALUES (%s,%s,%s)",
                    (num(m.get('price_from')), num(m.get('percent')), max(1, int(num(m.get('rounding'), 1)))),
                )
            conn.commit()
            return ok({'ok': True})

        if action == 'search':
            q = str(body.get('query') or '').strip()
            qn = norm(q)
            if len(qn) < 3:
                return err('Введите артикул (минимум 3 символа)')
            cols = "p.id, p.supplier_id, sp.name AS supplier_name, p.article, p.brand, p.name, p.price, p.qty, p.delivery_days, p.warehouse"
            base = f"SELECT {cols} FROM {s}.cab_price_items p JOIN {s}.cab_suppliers sp ON sp.id = p.supplier_id WHERE sp.active = true AND "
            found = rows(base + "p.article_norm = %s ORDER BY p.price LIMIT 200", (qn,))
            analogs = []
            if body.get('with_partial'):
                analogs = rows(
                    base + f"(p.article_norm LIKE %s OR p.article_norm IN (SELECT cross_norm FROM {s}.cab_crosses WHERE article_norm = %s "
                    f"UNION SELECT article_norm FROM {s}.cab_crosses WHERE cross_norm = %s)) AND p.article_norm <> %s ORDER BY p.price LIMIT 150",
                    (qn + '%', qn, qn, qn),
                )
            mk = markups()
            prio = {r['brand'].upper(): r['pos'] for r in rows(f"SELECT brand, pos FROM {s}.cab_priority_brands")}
            for r in found + analogs:
                r['price'] = float(r['price'])
                r['sale'] = sale_price(r['price'], mk)
            warning = None
            berg = next((r for r in rows(f"SELECT id, name FROM {s}.cab_suppliers WHERE active = true AND kind = 'api' ORDER BY id") if 'берг' in str(r['name']).lower() or 'berg' in str(r['name']).lower()), None)
            if berg:
                offers, warning = berg_search(q, bool(body.get('with_partial')))
                nid = -1
                for o in offers:
                    row = {
                        'id': nid, 'supplier_id': berg['id'], 'supplier_name': berg['name'] + ' (онлайн)',
                        'article': o['article'], 'brand': o['brand'], 'name': o['name'], 'price': o['price'],
                        'sale': sale_price(o['price'], mk), 'qty': o['qty'], 'delivery_days': o['delivery_days'], 'warehouse': o['warehouse'],
                        'berg_resource_id': o['berg_resource_id'], 'berg_warehouse_id': o['berg_warehouse_id'],
                    }
                    nid -= 1
                    (found if o['exact'] else analogs).append(row)
            key = lambda r: (prio.get((r['brand'] or '').upper(), 10**6), r['price'])
            found.sort(key=key)
            analogs.sort(key=key)
            cur.execute(f"INSERT INTO {s}.cab_search_history (query, results_count) VALUES (%s,%s)", (q[:100], len(found)))
            conn.commit()
            return ok({'items': found, 'partial': analogs, 'warning': warning})

        if action == 'bulk_check':
            mk = markups()
            out = []
            for r in (body.get('rows') or [])[:300]:
                art = str(r.get('article') or '').strip()
                an = norm(art)
                brand = str(r.get('brand') or '').strip().upper()
                if len(an) < 3:
                    out.append({'article': art, 'brand': brand, 'qty': r.get('qty'), 'offers': 0})
                    continue
                offers = rows(
                    f"SELECT sp.name AS supplier_name, p.brand, p.name, p.price, p.qty, p.delivery_days FROM {s}.cab_price_items p "
                    f"JOIN {s}.cab_suppliers sp ON sp.id = p.supplier_id WHERE sp.active = true AND p.article_norm = %s "
                    f"AND (%s = '' OR upper(p.brand) = %s) ORDER BY p.price LIMIT 20",
                    (an, brand, brand),
                )
                best = offers[0] if offers else None
                out.append({
                    'article': art, 'brand': brand, 'qty': r.get('qty'), 'offers': len(offers),
                    'name': best['name'] if best else '',
                    'supplier_name': best['supplier_name'] if best else '',
                    'price': float(best['price']) if best else None,
                    'sale': sale_price(float(best['price']), mk) if best else None,
                    'stock': best['qty'] if best else None,
                    'days': best['delivery_days'] if best else None,
                    'max_price': float(offers[-1]['price']) if offers else None,
                })
            return ok({'rows': out})

        if action == 'brands_list':
            q = str(body.get('query') or '').strip()
            return ok({'brands': [r['brand'] for r in rows(
                f"SELECT DISTINCT brand FROM {s}.cab_price_items WHERE brand <> '' AND (%s = '' OR brand ILIKE %s) ORDER BY brand LIMIT 100",
                (q, f"%{q}%"),
            )]})

        if action == 'priority_get':
            return ok({'brands': [r['brand'] for r in rows(f"SELECT brand FROM {s}.cab_priority_brands ORDER BY pos")]})

        if action == 'priority_save':
            cur.execute(f"DELETE FROM {s}.cab_priority_brands")
            seen = set()
            for pos, b in enumerate(body.get('brands') or []):
                b = str(b).strip().upper()[:80]
                if b and b not in seen:
                    seen.add(b)
                    cur.execute(f"INSERT INTO {s}.cab_priority_brands (brand, pos) VALUES (%s,%s)", (b, pos))
            conn.commit()
            return ok({'ok': True})

        if action == 'crosses_list':
            q = norm(body.get('query'))
            return ok({'crosses': rows(
                f"SELECT id, article, cross_article, cross_brand FROM {s}.cab_crosses "
                f"WHERE %s = '' OR article_norm LIKE %s OR cross_norm LIKE %s ORDER BY id DESC LIMIT 300",
                (q, q + '%', q + '%'),
            )})

        if action == 'cross_add':
            a, c = str(body.get('article') or '').strip(), str(body.get('cross_article') or '').strip()
            if len(norm(a)) < 3 or len(norm(c)) < 3 or norm(a) == norm(c):
                return err('Укажите два разных артикула')
            cur.execute(
                f"INSERT INTO {s}.cab_crosses (article_norm, article, cross_norm, cross_article, cross_brand) VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                (norm(a), a[:80], norm(c), c[:80], str(body.get('cross_brand') or '')[:80]),
            )
            conn.commit()
            return ok({'ok': True})

        if action == 'cross_delete':
            cur.execute(f"DELETE FROM {s}.cab_crosses WHERE id = %s", (body.get('id'),))
            conn.commit()
            return ok({'ok': True})

        if action == 'history_list':
            return ok({'history': rows(f"SELECT id, query, results_count, created_at FROM {s}.cab_search_history ORDER BY id DESC LIMIT 200")})

        if action == 'history_delete':
            if body.get('all'):
                cur.execute(f"DELETE FROM {s}.cab_search_history")
            else:
                cur.execute(f"DELETE FROM {s}.cab_search_history WHERE id = %s", (body.get('id'),))
            conn.commit()
            return ok({'ok': True})

        if action == 'cart_list':
            return ok({'items': rows(f"SELECT * FROM {s}.cab_cart WHERE draft = %s ORDER BY id", (bool(body.get('draft')),))})

        if action == 'cart_draft':
            ids = [int(i) for i in (body.get('ids') or [])]
            if ids:
                cur.execute(f"UPDATE {s}.cab_cart SET draft = %s WHERE id = ANY(%s)", (bool(body.get('draft')), ids))
                conn.commit()
            return ok({'ok': True})

        if action == 'cart_add':
            qty = max(1, int(num(body.get('qty'), 1)))
            cur.execute(
                f"INSERT INTO {s}.cab_cart (article, brand, name, supplier_id, supplier_name, delivery_days, price_buy, price_sale, qty, berg_resource_id, berg_warehouse_id) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (str(body.get('article') or '')[:80], str(body.get('brand') or '')[:80], str(body.get('name') or '')[:300],
                 body.get('supplier_id'), str(body.get('supplier_name') or '')[:120], body.get('delivery_days'),
                 num(body.get('price_buy')), num(body.get('price_sale')), qty,
                 str(body.get('berg_resource_id') or '') or None, str(body.get('berg_warehouse_id') or '') or None),
            )
            conn.commit()
            return ok({'ok': True})

        if action == 'cart_update':
            cur.execute(
                f"UPDATE {s}.cab_cart SET qty = %s, price_sale = %s, note = %s WHERE id = %s",
                (max(1, int(num(body.get('qty'), 1))), num(body.get('price_sale')), body.get('note') or None, body.get('id')),
            )
            conn.commit()
            return ok({'ok': True})

        if action == 'cart_delete':
            ids = [int(i) for i in (body.get('ids') or [])]
            if ids:
                cur.execute(f"DELETE FROM {s}.cab_cart WHERE id = ANY(%s)", (ids,))
                conn.commit()
            return ok({'ok': True})

        if action == 'order_create':
            ids = [int(i) for i in (body.get('ids') or [])]
            items = rows(f"SELECT * FROM {s}.cab_cart WHERE id = ANY(%s) ORDER BY id", (ids,)) if ids else []
            if not items:
                return err('Корзина пуста')
            client = one(f"SELECT * FROM {s}.cab_clients WHERE id = %s", (body.get('client_id'),)) if body.get('client_id') else None
            berg_items = [i for i in items if i.get('berg_resource_id') and i.get('berg_warehouse_id')]
            berg_id = None
            if berg_items:
                berg_id, berg_err = berg_order(berg_items, str(body.get('comment') or ''))
                if berg_err:
                    return err('Заказ не создан. ' + berg_err)
            total_sale = sum(float(i['price_sale']) * i['qty'] for i in items)
            total_buy = sum(float(i['price_buy']) * i['qty'] for i in items)
            cur.execute(
                f"INSERT INTO {s}.cab_orders (client_id, client_name, client_phone, car, comment, total_sale, total_buy, berg_order_id) "
                f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id",
                (client['id'] if client else None,
                 (client['full_name'] if client else str(body.get('client_name') or '')[:200]) or None,
                 (client['phone'] if client else str(body.get('client_phone') or '')[:50]) or None,
                 (str(body.get('car') or '')[:200] or (client['car'] if client else None)),
                 str(body.get('comment') or '')[:1000] or None, total_sale, total_buy, berg_id),
            )
            oid = cur.fetchone()['id']
            for i in items:
                cur.execute(
                    f"INSERT INTO {s}.cab_order_items (order_id, article, brand, name, supplier_name, delivery_days, price_buy, price_sale, qty, berg_resource_id, berg_warehouse_id) "
                    f"VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    (oid, i['article'], i['brand'], i['name'], i['supplier_name'], i['delivery_days'], i['price_buy'], i['price_sale'], i['qty'], i.get('berg_resource_id'), i.get('berg_warehouse_id')),
                )
            cur.execute(f"DELETE FROM {s}.cab_cart WHERE id = ANY(%s)", ([i['id'] for i in items],))
            conn.commit()
            return ok({'id': oid})

        if action == 'orders_list':
            q = str(body.get('query') or '').strip()
            like = f"%{q}%"
            data = rows(
                f"SELECT o.*, (SELECT COUNT(*) FROM {s}.cab_order_items i WHERE i.order_id = o.id) AS items_count "
                f"FROM {s}.cab_orders o "
                f"WHERE (%s = '' OR o.id::text = %s OR o.berg_order_id ILIKE %s OR o.client_name ILIKE %s OR o.client_phone ILIKE %s OR o.car ILIKE %s OR o.comment ILIKE %s "
                f"OR EXISTS (SELECT 1 FROM {s}.cab_order_items i WHERE i.order_id = o.id AND (i.article ILIKE %s OR i.brand ILIKE %s OR i.supplier_name ILIKE %s OR i.name ILIKE %s))) "
                f"ORDER BY o.id DESC LIMIT 300",
                (q, q, like, like, like, like, like, like, like, like, like),
            )
            return ok({'orders': data})

        if action == 'order_get':
            o = one(f"SELECT * FROM {s}.cab_orders WHERE id = %s", (body.get('id'),))
            if not o:
                return err('Заказ не найден', 404)
            o['items'] = rows(f"SELECT * FROM {s}.cab_order_items WHERE order_id = %s ORDER BY id", (o['id'],))
            return ok({'order': o})

        if action == 'order_status':
            if body.get('status') not in ORDER_STATUSES:
                return err('Неверный статус')
            cur.execute(f"UPDATE {s}.cab_orders SET status = %s WHERE id = %s", (body['status'], body.get('id')))
            conn.commit()
            return ok({'ok': True})

        if action == 'leads_list':
            q = str(body.get('query') or '').strip()
            like = f"%{q}%"
            return ok({'leads': rows(
                f"SELECT id, archived, name, phone, vin, car_name, parts, city, messenger, status, order_amount, prepayment, remaining, handled_by, internal_note, ai_articles, created_at "
                f"FROM {s}.leads WHERE (%s = '' OR id::text = %s OR name ILIKE %s OR phone ILIKE %s OR vin ILIKE %s OR car_name ILIKE %s OR parts ILIKE %s OR city ILIKE %s) "
                f"ORDER BY created_at DESC LIMIT 500",
                (q, q, like, like, like, like, like, like),
            )})

        if action == 'clients_list':
            cur.execute(
                f"INSERT INTO {s}.cab_clients (full_name, phone, car, notes) "
                f"SELECT l.name, l.phone, l.car_name, 'Из заявки с сайта' FROM ("
                f"SELECT DISTINCT ON (right(regexp_replace(phone, '\\D', '', 'g'), 10)) name, phone, car_name "
                f"FROM {s}.leads WHERE length(regexp_replace(coalesce(phone, ''), '\\D', '', 'g')) >= 10 AND coalesce(name, '') <> '' "
                f"ORDER BY right(regexp_replace(phone, '\\D', '', 'g'), 10), created_at DESC) l "
                f"WHERE NOT EXISTS (SELECT 1 FROM {s}.cab_clients c WHERE right(regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g'), 10) = right(regexp_replace(l.phone, '\\D', '', 'g'), 10))"
            )
            conn.commit()
            return ok({'clients': rows(f"SELECT * FROM {s}.cab_clients ORDER BY full_name")})

        if action == 'client_history':
            c = one(f"SELECT id, phone FROM {s}.cab_clients WHERE id = %s", (body.get('id'),))
            if not c:
                return err('Клиент не найден', 404)
            last10 = re.sub(r'\D', '', c['phone'] or '')[-10:]
            orders = rows(
                f"SELECT id, status, total_sale, created_at FROM {s}.cab_orders "
                f"WHERE client_id = %s OR (%s <> '' AND right(regexp_replace(coalesce(client_phone, ''), '\\D', '', 'g'), 10) = %s) "
                f"ORDER BY id DESC LIMIT 100",
                (c['id'], last10, last10),
            )
            leads = rows(
                f"SELECT id, status, order_amount, parts, created_at FROM {s}.leads "
                f"WHERE %s <> '' AND right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = %s "
                f"ORDER BY created_at DESC LIMIT 100",
                (last10, last10),
            ) if last10 else []
            return ok({'orders': orders, 'leads': leads})

        if action == 'lead_client':
            lead = one(f"SELECT name, phone, car_name FROM {s}.leads WHERE id = %s", (body.get('id'),))
            if not lead:
                return err('Заявка не найдена', 404)
            last10 = re.sub(r'\D', '', lead['phone'] or '')[-10:]
            client = None
            if last10:
                client = one(
                    f"SELECT id, full_name, phone, car, notes FROM {s}.cab_clients "
                    f"WHERE right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 10) = %s ORDER BY id LIMIT 1",
                    (last10,),
                )
            if not client:
                cur.execute(
                    f"INSERT INTO {s}.cab_clients (full_name, phone, car) VALUES (%s,%s,%s) RETURNING id, full_name, phone, car, notes",
                    (str(lead['name'] or 'Клиент')[:200], str(lead['phone'] or '')[:50] or None, str(lead['car_name'] or '')[:200] or None),
                )
                client = dict(cur.fetchone())
                conn.commit()
            return ok({'client': client, 'car': lead['car_name'] or client.get('car') or ''})

        if action == 'client_save':
            name = str(body.get('full_name') or '').strip()
            if not name:
                return err('Укажите ФИО')
            vals = (name[:200], str(body.get('phone') or '')[:50] or None, str(body.get('car') or '')[:200] or None, str(body.get('notes') or '')[:1000] or None)
            if body.get('id'):
                cur.execute(f"UPDATE {s}.cab_clients SET full_name=%s, phone=%s, car=%s, notes=%s WHERE id=%s", vals + (body['id'],))
            else:
                cur.execute(f"INSERT INTO {s}.cab_clients (full_name, phone, car, notes) VALUES (%s,%s,%s,%s)", vals)
            conn.commit()
            return ok({'ok': True})

        if action == 'client_delete':
            cur.execute(f"DELETE FROM {s}.cab_clients WHERE id = %s", (body.get('id'),))
            conn.commit()
            return ok({'ok': True})

        if action == 'garage_list':
            q = str(body.get('query') or '').strip()
            like = f"%{q}%"
            return ok({'cars': rows(
                f"SELECT g.*, c.full_name AS client_name, c.phone AS client_phone FROM {s}.cab_garage g LEFT JOIN {s}.cab_clients c ON c.id = g.client_id "
                f"WHERE %s = '' OR g.owner ILIKE %s OR g.vin ILIKE %s OR g.plate ILIKE %s OR g.model ILIKE %s OR c.full_name ILIKE %s OR c.phone ILIKE %s "
                f"ORDER BY g.id DESC LIMIT 300",
                (q, like, like, like, like, like, like),
            )})

        if action == 'garage_save':
            model = str(body.get('model') or '').strip()
            vin = str(body.get('vin') or '').strip()
            plate = str(body.get('plate') or '').strip()
            if not (model or vin or plate):
                return err('Укажите модель, VIN или госномер')
            vals = (body.get('client_id') or None, str(body.get('owner') or '')[:200] or None, vin[:32] or None, plate[:20] or None, model[:200] or None, str(body.get('notes') or '')[:1000] or None)
            if body.get('id'):
                cur.execute(f"UPDATE {s}.cab_garage SET client_id=%s, owner=%s, vin=%s, plate=%s, model=%s, notes=%s WHERE id=%s", vals + (body['id'],))
            else:
                cur.execute(f"INSERT INTO {s}.cab_garage (client_id, owner, vin, plate, model, notes) VALUES (%s,%s,%s,%s,%s,%s)", vals)
            conn.commit()
            return ok({'ok': True})

        if action == 'garage_delete':
            cur.execute(f"DELETE FROM {s}.cab_garage WHERE id = %s", (body.get('id'),))
            conn.commit()
            return ok({'ok': True})

        if action == 'analytics':
            days = min(365, max(1, int(num(body.get('days'), 30))))
            period = f"now() - INTERVAL '{days} days'"
            summary = one(
                f"SELECT COUNT(*) AS orders, COALESCE(SUM(total_sale),0) AS sale, COALESCE(SUM(total_buy),0) AS buy "
                f"FROM {s}.cab_orders WHERE status <> 'cancelled' AND created_at >= {period}"
            )
            by_supplier = rows(
                f"SELECT i.supplier_name, COUNT(*) AS positions, SUM(i.qty) AS qty, SUM(i.price_buy * i.qty) AS buy, SUM(i.price_sale * i.qty) AS sale, "
                f"AVG(i.delivery_days) AS avg_days FROM {s}.cab_order_items i JOIN {s}.cab_orders o ON o.id = i.order_id "
                f"WHERE o.status <> 'cancelled' AND o.created_at >= {period} GROUP BY i.supplier_name ORDER BY buy DESC"
            )
            top_search = rows(
                f"SELECT query, COUNT(*) AS cnt, MAX(results_count) AS found FROM {s}.cab_search_history WHERE created_at >= {period} "
                f"GROUP BY query ORDER BY cnt DESC, query LIMIT 15"
            )
            not_found = rows(
                f"SELECT query, COUNT(*) AS cnt FROM {s}.cab_search_history WHERE created_at >= {period} "
                f"GROUP BY query HAVING MAX(results_count) = 0 ORDER BY cnt DESC LIMIT 15"
            )
            top_items = rows(
                f"SELECT i.article, i.brand, SUM(i.qty) AS qty, SUM(i.price_sale * i.qty) AS sale FROM {s}.cab_order_items i "
                f"JOIN {s}.cab_orders o ON o.id = i.order_id WHERE o.status <> 'cancelled' AND o.created_at >= {period} "
                f"GROUP BY i.article, i.brand ORDER BY sale DESC LIMIT 10"
            )
            return ok({'summary': summary, 'by_supplier': by_supplier, 'top_search': top_search, 'not_found': not_found, 'top_items': top_items})

        if action == 'stats':
            return ok({'stats': one(
                f"SELECT (SELECT COUNT(*) FROM {s}.cab_search_history) AS searches, "
                f"(SELECT COUNT(*) FROM {s}.cab_suppliers WHERE active) AS suppliers, "
                f"(SELECT COUNT(*) FROM {s}.cab_orders) AS orders, "
                f"(SELECT COALESCE(SUM(total_sale),0) FROM {s}.cab_orders WHERE status <> 'cancelled') AS orders_sum, "
                f"(SELECT COUNT(*) FROM {s}.cab_cart WHERE draft = false) AS cart"
            )})

        return err('Неизвестное действие')
    finally:
        conn.close()
