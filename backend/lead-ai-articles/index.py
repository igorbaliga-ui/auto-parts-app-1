import json
import re
import os
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import psycopg2
from fapi import enrich_line, fapi_catalog, fapi_enabled, FapiError, fapi_usage
from rate_limit import get_client_ip, check_rate_limit

SYSTEM_PROMPT = (
    "Ты помощник менеджера магазина автозапчастей. Работай в два шага. "
    "Шаг 1: расшифруй VIN — марка, модель, кузов, двигатель (объём, тип), год выпуска, страна сборки. "
    "Что не удаётся определить по VIN — так и пиши «не определено», ничего не выдумывай. "
    "Шаг 2: используя расшифровку, предложи вероятные артикулы (OEM и популярные аналоги) для каждой запчасти. "
    "Если не уверен в артикуле — пиши «нужна проверка», номера не выдумывай. "
    "Отвечай по-русски, коротко. Верни строго JSON: "
    '{"decoded": "расшифровка VIN в 1-3 строки, например: Audi Q5 (8R), 2.0 TFSI, 2010 г., Германия", '
    '"articles": "по одной строке на позицию в формате: Запчасть — артикул OEM; аналоги: ..."}. '
    "Если VIN не указан, decoded — пустая строка."
)

AI_ENABLED = False
PARTSAPI_URL = 'https://partsapi.ru/api.php'
CAR_TYPES = ['PC', '1']
LANG_ID = 16


class CatalogError(Exception):
    pass


STEP_NAMES = {
    'VINdecode': 'расшифровка VIN',
    'getSearchTree': 'дерево групп запчастей',
    'getArticles': 'поиск артикулов',
    'getPartsbyVIN': 'оригинальные номера по VIN',
}


def reason_text(status, message: str) -> str:
    text = (message or '').lower()
    if status == 402 or 'subscr' in text or 'payment' in text or 'balance' in text or 'expired' in text:
        return 'нет подписки на метод или она закончилась'
    if status in (401, 403) or 'authorization' in text or 'key' in text:
        return 'ключ не принят каталогом или нет доступа к методу'
    if status == 429 or 'limit' in text or 'too many' in text:
        return 'исчерпан лимит запросов'
    if status == 404:
        return 'каталог не нашёл данные'
    return 'каталог вернул ошибку'


METHOD_KEYS = {
    'getSearchTree': 'PARTSAPI_KEY_TREE',
    'getArticles': 'PARTSAPI_KEY_ARTICLES',
    'getPartsbyVIN': 'PARTSAPI_KEY_VIN',
}


def method_key(method: str) -> str:
    specific = os.environ.get(METHOD_KEYS.get(method, ''), '').strip()
    return specific or os.environ.get('PARTSAPI_KEY', '').strip()


def partsapi(method: str, **params):
    step = STEP_NAMES.get(method, method)
    query = urllib.parse.urlencode({'method': method, 'key': method_key(method), **params})
    try:
        with urllib.request.urlopen(f'{PARTSAPI_URL}?{query}', timeout=8) as resp:
            raw = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', 'ignore')[:300]
        print(f'PartsAPI {method} error {e.code}: {body}')
        message = ''
        try:
            message = str(json.loads(body).get('message') or '')
        except ValueError:
            pass
        raise CatalogError(f'{step}: {reason_text(e.code, message)}')
    except Exception as e:
        print(f'PartsAPI {method} failed: {e}')
        raise CatalogError(f'{step}: каталог недоступен (нет ответа)')
    try:
        data = json.loads(raw)
    except ValueError:
        print(f'PartsAPI {method} not json: {raw[:300]}')
        raise CatalogError(f'{step}: каталог недоступен (неверный ответ)')
    print(f'PartsAPI {method} ok: {raw[:600]}')
    if isinstance(data, dict) and (data.get('error_code') or data.get('status') in (401, 402, 403, 404, 429)):
        raise CatalogError(f'{step}: {reason_text(data.get("status"), str(data.get("message") or ""))}')
    return data


def as_list(data):
    if isinstance(data, dict) and 'result' in data:
        data = data['result']
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        values = list(data.values())
        if values and all(isinstance(v, dict) for v in values):
            return values
        for v in values:
            if isinstance(v, list):
                return v
        return [data]
    return []


def first_of(d: dict, *keys):
    for k in keys:
        v = d.get(k)
        if v not in (None, '', []):
            return v
    return None


def decode_vin(vin: str):
    items = as_list(partsapi('VINdecode', vin=vin, lang='ru'))
    if not items or not isinstance(items[0], dict):
        raise CatalogError('расшифровка VIN: каталог не знает такой VIN')
    c = items[0]
    car_id = first_of(c, 'carId', 'TecDocExternalId')
    parts = []
    name = ' '.join(str(x) for x in [first_of(c, 'manuName'), first_of(c, 'modelName'), first_of(c, 'typeName')] if x)
    if name:
        parts.append(name)
    liter = first_of(c, 'cylinderCapacityLiter')
    if liter:
        parts.append(f'{liter} л')
    if first_of(c, 'fuelType'):
        parts.append(str(first_of(c, 'fuelType')))
    hp = first_of(c, 'powerHpFrom')
    if hp:
        parts.append(f'{hp} л.с.')
    codes = c.get('motorCodes')
    if codes:
        parts.append('двигатель ' + (', '.join(map(str, codes)) if isinstance(codes, list) else str(codes)))
    if first_of(c, 'constructionType', 'bodyStyle'):
        parts.append(str(first_of(c, 'constructionType', 'bodyStyle')))
    y1, y2 = first_of(c, 'yearOfConstrFrom'), first_of(c, 'yearOfConstrTo')
    if y1:
        parts.append(f'{str(y1)[:4]}–{str(y2)[:4] if y2 else "н.в."} г.')
    return car_id, (', '.join(parts) or None)


def load_tree(car_id):
    for car_type in CAR_TYPES:
        rows = [r for r in as_list(partsapi('getSearchTree', lang=LANG_ID, carId=car_id, carType=car_type)) if isinstance(r, dict)]
        if rows:
            parents = {str(r.get('STR_ID_PARENT')) for r in rows if r.get('STR_ID_PARENT')}
            nodes = {}
            for r in rows:
                sid = r.get('STR_ID')
                path = r.get('STR_PATH') or r.get('STR_NODE_NAME')
                if sid and path and str(sid) not in parents:
                    nodes[str(sid)] = str(path)
            if nodes:
                return car_type, nodes
    raise CatalogError('дерево групп запчастей: для этого авто в каталоге нет данных')


def stems(text: str):
    words = re.findall(r'[а-яёa-z0-9]+', text.lower())
    return {w[:max(4, len(w) - 2)] for w in words if len(w) >= 4}


def shortlist(nodes: dict, part_lines: list, per_part: int = 12) -> dict:
    chosen = {}
    node_stems = {k: stems(v) for k, v in nodes.items()}
    for line in part_lines:
        ps = stems(line)
        if not ps:
            continue
        scored = []
        for k, ns in node_stems.items():
            score = sum(1 for p in ps if any(n.startswith(p) or p.startswith(n) for n in ns))
            if score:
                scored.append((score, -len(nodes[k]), k))
        scored.sort(reverse=True)
        for _, _, k in scored[:per_part]:
            chosen[k] = nodes[k]
    return chosen


PREFERRED_BRANDS = [
    'AUDI', 'VAG', 'VW', 'VOLKSWAGEN', 'SKODA', 'SEAT', 'BOSCH', 'MANN-FILTER', 'MANN', 'MAHLE', 'KNECHT', 'HENGST',
    'FILTRON', 'BREMBO', 'TRW', 'ATE', 'ZIMMERMANN', 'TEXTAR', 'FERODO', 'LEMFORDER', 'SACHS', 'BILSTEIN', 'MONROE',
    'KYB', 'FEBI BILSTEIN', 'FEBI', 'SWAG', 'MEYLE', 'NGK', 'DENSO', 'VALEO', 'LUK', 'SKF', 'GATES', 'CONTITECH',
    'DAYCO', 'INA', 'FAG', 'HELLA', 'BEHR', 'NRF', 'CORTECO', 'ELRING', 'PIERBURG', 'VICTOR REINZ', 'REINZ',
]


def brand_rank(item: str) -> int:
    up = item.upper()
    for i, b in enumerate(PREFERRED_BRANDS):
        if up.startswith(b + ' ') or up.startswith(b):
            return i
    return len(PREFERRED_BRANDS)


def fetch_articles(car_id, car_type, str_id):
    rows = [r for r in as_list(partsapi('getArticles', lang=LANG_ID, strId=str_id, carId=car_id, carType=car_type)) if isinstance(r, dict)]
    seen, out = set(), []
    for r in rows:
        brand = first_of(r, 'ART_SUP_BRAND', 'SUP_BRAND', 'BRAND', 'brand')
        nr = first_of(r, 'ART_ARTICLE_NR', 'ARTICLE_NR', 'ART_NR', 'articleNo', 'number')
        if brand and nr and (brand, nr) not in seen:
            seen.add((brand, nr))
            out.append(f'{brand} {nr}')
    return sorted(out, key=brand_rank)


def collect_numbers(node, out):
    if isinstance(node, dict):
        brand = first_of(node, 'brand', 'BRAND', 'mfr', 'manufacturer', 'brandName')
        for k, v in node.items():
            kl = str(k).lower()
            if isinstance(v, (str, int)) and v not in ('', None) and (
                'oem' in kl or 'number' in kl or kl in ('nr', 'article', 'articleno', 'partnumber', 'partsnumber', 'num')
            ) and 'name' not in kl:
                out.append(f'{brand} {v}'.strip() if brand else str(v))
            elif isinstance(v, (dict, list)):
                collect_numbers(v, out)
    elif isinstance(node, list):
        for x in node:
            collect_numbers(x, out)


def fetch_originals(vin: str, str_id):
    data = partsapi('getPartsbyVIN', vin=vin, cat=str_id)
    found = []
    collect_numbers(data.get('result') if isinstance(data, dict) and 'result' in data else data, found)
    seen, out = set(), []
    for n in found:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def safe_originals(vin: str, str_id):
    try:
        return fetch_originals(vin, str_id)
    except CatalogError as e:
        print(f'originals skipped: {e}')
        return []


def deepseek(api_key: str, system: str, user: str, timeout: int = 40):
    payload = {
        'model': 'deepseek-chat',
        'temperature': 0.1,
        'response_format': {'type': 'json_object'},
        'messages': [{'role': 'system', 'content': system}, {'role': 'user', 'content': user}],
    }
    req = urllib.request.Request(
        'https://api.deepseek.com/chat/completions',
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return json.loads(data['choices'][0]['message']['content'])


MATCH_PROMPT = (
    "Ты помощник менеджера автозапчастей. Тебе дан список запчастей из заявки и список групп каталога "
    "в формате «id: путь». Для каждой запчасти выбери ОДИН наиболее подходящий id группы. "
    "Если подходящей группы нет — id null. Верни JSON: "
    '{"items": [{"part": "название запчасти из заявки", "id": "id группы или null"}]}'
)


CACHE_DAYS = 30


class CatalogCache:
    def __init__(self, conn, schema: str):
        self.conn = conn
        self.table = f'{schema}.catalog_cache'

    def get(self, key: str):
        try:
            cur = self.conn.cursor()
            cur.execute(
                f"SELECT payload FROM {self.table} WHERE cache_key = %s AND created_at > NOW() - INTERVAL '{CACHE_DAYS} days'",
                (key,),
            )
            row = cur.fetchone()
            cur.close()
            return json.loads(row[0]) if row else None
        except Exception as e:
            print(f'cache get failed: {e}')
            self.conn.rollback()
            return None

    def put(self, key: str, value):
        try:
            cur = self.conn.cursor()
            cur.execute(
                f"INSERT INTO {self.table} (cache_key, payload, created_at) VALUES (%s, %s, NOW()) "
                f"ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, created_at = NOW()",
                (key, json.dumps(value, ensure_ascii=False)),
            )
            self.conn.commit()
            cur.close()
        except Exception as e:
            print(f'cache put failed: {e}')
            self.conn.rollback()


def cached_vin(cache, vin: str):
    key = f'vin:{vin.upper()}'
    hit = cache.get(key)
    if hit and hit.get('car_id'):
        print(f'cache hit {key}')
        return hit['car_id'], hit.get('decoded')
    car_id, decoded = decode_vin(vin)
    if car_id:
        cache.put(key, {'car_id': car_id, 'decoded': decoded})
    return car_id, decoded


def cached_tree(cache, car_id):
    key = f'tree:{car_id}'
    hit = cache.get(key)
    if hit and hit.get('nodes'):
        print(f'cache hit {key}')
        return hit['car_type'], hit['nodes']
    car_type, nodes = load_tree(car_id)
    cache.put(key, {'car_type': car_type, 'nodes': nodes})
    return car_type, nodes


def orig_cached(cache, vin: str, sid):
    key = f'orig:{vin.upper()}:{sid}'
    hit = cache.get(key)
    if hit and hit.get('items'):
        return hit['items']
    items = safe_originals(vin, sid)
    if items:
        cache.put(key, {'items': items})
    return items


def articles_key(car_id, car_type, str_id) -> str:
    return f'art:{car_id}:{car_type}:{str_id}'


def catalog_articles(api_key: str, vin: str, parts: str, cache, info=None):
    """Возвращает (расшифровка VIN, текст артикулов, причина почему каталог не помог)."""
    if not vin:
        return None, None, 'в заявке нет VIN, каталог не использовался'
    fapi_note = None
    if fapi_enabled():
        lines_in = [p.strip() for p in re.split(r'[\n;,]+', parts) if p.strip()][:10]
        try:
            f_decoded, f_answer, f_note = fapi_catalog(vin.strip(), lines_in, shortlist, cache)
            if f_answer:
                if info is not None:
                    info['via'] = 'fapi'
                return f_decoded, f_answer, None
            fapi_note = f_note
        except FapiError as e:
            fapi_note = str(e)
        except Exception as e:
            print(f'fapi flow failed: {e}')
            fapi_note = 'FAPI: внутренняя ошибка'
        if not os.environ.get('PARTSAPI_KEY'):
            return None, None, fapi_note
    if not os.environ.get('PARTSAPI_KEY'):
        return None, None, 'ключ каталога не задан'
    decoded = None
    try:
        car_id, decoded = cached_vin(cache, vin.strip())
        if not car_id:
            return decoded, None, 'расшифровка VIN: каталог не вернул идентификатор авто'
        car_type, nodes = cached_tree(cache, car_id)
        part_lines = [p.strip() for p in re.split(r'[\n;,]+', parts) if p.strip()][:10]
        candidates = shortlist(nodes, part_lines)
        if not candidates:
            return decoded, None, 'дерево групп запчастей: не нашлось подходящих групп для запчастей из заявки'
        nodes = candidates
        tree_text = '\n'.join(f'{k}: {v}' for k, v in nodes.items())
        if AI_ENABLED:
            matched = deepseek(api_key, MATCH_PROMPT, f'Запчасти:\n' + '\n'.join(part_lines) + f'\n\nГруппы каталога:\n{tree_text}', timeout=12)
        else:
            matched = {'items': [{'part': line, 'id': next(iter(shortlist(nodes, [line], per_part=1)), None)} for line in part_lines]}
        items = [i for i in matched.get('items', []) if isinstance(i, dict) and i.get('part')]
        valid = [i for i in items if i.get('id') and str(i['id']) in nodes]
        results_by_id = {}
        missing = []
        for i in valid:
            sid = str(i['id'])
            hit = cache.get(articles_key(car_id, car_type, sid))
            if hit and hit.get('items'):
                print(f'cache hit {articles_key(car_id, car_type, sid)}')
                results_by_id[sid] = hit['items']
            elif sid not in missing:
                missing.append(sid)
        if missing:
            with ThreadPoolExecutor(max_workers=6) as pool:
                fetched = list(pool.map(lambda sid: fetch_articles(car_id, car_type, sid), missing))
                originals = list(pool.map(lambda sid: orig_cached(cache, vin.strip(), sid), missing))
            for sid, arts, origs in zip(missing, fetched, originals):
                merged = origs + [a for a in arts if a not in origs]
                results_by_id[sid] = merged
                if merged:
                    cache.put(articles_key(car_id, car_type, sid), {'items': merged})
        results = [results_by_id.get(str(i['id']), []) if i in valid else [] for i in items]
    except CatalogError as e:
        return decoded, None, '; '.join(x for x in [fapi_note, str(e)] if x)
    lines = []
    found = 0
    for item, arts in zip(items, results):
        if arts:
            found += 1
            lines.append(f"{item['part']} — {', '.join(arts[:8])}" if fapi_note else enrich_line(item['part'], arts, cache))
        else:
            lines.append(f"{item['part']} — в каталоге не найдено, нужна проверка")
    if not found:
        return decoded, None, '; '.join(x for x in [fapi_note, 'поиск артикулов: каталог не нашёл подходящих запчастей'] if x)
    return decoded, '\n'.join(lines), None


def handler(event: dict, context) -> dict:
    """Подбирает с помощью ИИ вероятные артикулы запчастей для заявки по её id (VIN, авто,
    список запчастей) и сохраняет результат в заявку (поле ai_articles) как черновик для менеджера.
    Доступно только менеджеру по паролю администратора."""
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

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    if not check_rate_limit(dsn, schema, get_client_ip(event), 'lead-ai-articles', max_requests=30, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')
    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    if body.get('action') == 'fapi_check':
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(fapi_usage())}
    lead_id = body.get('id')
    if not isinstance(lead_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    api_key = os.environ.get('DEEPSEEK_API_KEY') or ''
    if AI_ENABLED and not api_key:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'Не задан ключ ИИ'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT vin, car_name, parts FROM {schema}.leads WHERE id = %s", (lead_id,))
        row = cur.fetchone()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Заявка не найдена'})}
        vin, car_name, parts = row
        if not parts:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'В заявке нет списка запчастей'})}

        decoded, answer, note = None, None, None
        info = {}
        try:
            decoded, answer, note = catalog_articles(api_key, vin, parts, CatalogCache(conn, schema), info)
        except Exception as e:
            print(f'catalog flow failed: {e}')
            note = 'каталог недоступен (внутренняя ошибка)'
        source = 'catalog' if answer else 'ai'

        if not answer and not AI_ENABLED:
            answer = '\n'.join(f'{p.strip()} — в каталоге не найдено, нужна проверка' for p in re.split(r'[\n;,]+', parts) if p.strip())
            source = 'catalog'
        elif not answer:
            user_text = f"VIN: {vin or 'не указан'}\nАвто: {car_name or 'не указано'}\nЗапчасти: {parts}"
            try:
                parsed = deepseek(api_key, SYSTEM_PROMPT, user_text)
            except urllib.error.HTTPError as e:
                details = e.read().decode('utf-8', 'ignore')[:500]
                print(f'AI error {e.code}: {details}')
                return {'statusCode': 502, 'headers': headers, 'body': json.dumps({'error': f'ИИ отклонил запрос ({e.code})'})}
            answer = str(parsed.get('articles') or '').strip()
            decoded = decoded or str(parsed.get('decoded') or '').strip()

        cur.execute(
            f"UPDATE {schema}.leads SET ai_articles = %s, vin_decoded = %s, catalog_note = %s, ai_source = %s WHERE id = %s",
            (answer, decoded or None, note, info.get('via') or source, lead_id),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ai_articles': answer, 'vin_decoded': decoded or '', 'source': source, 'via': info.get('via', ''), 'catalog_note': note or ''})}
