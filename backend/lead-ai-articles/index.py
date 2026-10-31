import json
import os
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
import urllib.request
import psycopg2
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

PARTSAPI_URL = 'https://partsapi.ru/api.php'
CAR_TYPES = ['PC', '1']
LANG_ID = 16


def partsapi(method: str, **params):
    query = urllib.parse.urlencode({'method': method, 'key': os.environ.get('PARTSAPI_KEY', ''), **params})
    try:
        with urllib.request.urlopen(f'{PARTSAPI_URL}?{query}', timeout=12) as resp:
            raw = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        print(f'PartsAPI {method} error {e.code}: {e.read().decode("utf-8", "ignore")[:300]}')
        return None
    except Exception as e:
        print(f'PartsAPI {method} failed: {e}')
        return None
    try:
        data = json.loads(raw)
    except ValueError:
        print(f'PartsAPI {method} not json: {raw[:300]}')
        return None
    print(f'PartsAPI {method} ok: {raw[:300]}')
    return data


def as_list(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for v in data.values():
            if isinstance(v, list):
                return v
        if data.get('error_code') or data.get('status') in (401, 403, 404):
            return []
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
        return None, None
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
    if first_of(c, 'constructionType'):
        parts.append(str(first_of(c, 'constructionType')))
    y1, y2 = first_of(c, 'yearOfConstrFrom'), first_of(c, 'yearOfConstrTo')
    if y1:
        parts.append(f'{str(y1)[:4]}–{str(y2)[:4] if y2 else "н.в."} г.')
    return car_id, (', '.join(parts) or None)


def load_tree(car_id):
    for car_type in CAR_TYPES:
        rows = [r for r in as_list(partsapi('getSearchTree', lang=LANG_ID, carId=car_id, carType=car_type)) if isinstance(r, dict)]
        if rows:
            nodes = {}
            for r in rows:
                for lvl in (3, 2, 1):
                    sid, txt = r.get(f'NODE_{lvl}_STR_ID'), r.get(f'NODE_{lvl}_TEXT')
                    if sid and txt:
                        nodes[str(sid)] = f"{r.get('ROOT_NODE_TEXT') or ''} / {txt}".strip(' /')
                        break
            return car_type, nodes
    return None, {}


def fetch_articles(car_id, car_type, str_id):
    rows = [r for r in as_list(partsapi('getArticles', lang=LANG_ID, strId=str_id, carId=car_id, carType=car_type)) if isinstance(r, dict)]
    seen, out = set(), []
    for r in rows:
        brand = first_of(r, 'ART_SUP_BRAND', 'SUP_BRAND')
        nr = first_of(r, 'ART_ARTICLE_NR')
        if brand and nr and (brand, nr) not in seen:
            seen.add((brand, nr))
            out.append(f'{brand} {nr}')
    return out


def deepseek(api_key: str, system: str, user: str):
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
    with urllib.request.urlopen(req, timeout=40) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    return json.loads(data['choices'][0]['message']['content'])


MATCH_PROMPT = (
    "Ты помощник менеджера автозапчастей. Тебе дан список запчастей из заявки и список групп каталога "
    "в формате «id: путь». Для каждой запчасти выбери ОДИН наиболее подходящий id группы. "
    "Если подходящей группы нет — id null. Верни JSON: "
    '{"items": [{"part": "название запчасти из заявки", "id": "id группы или null"}]}'
)


def catalog_articles(api_key: str, vin: str, parts: str):
    """Возвращает (расшифровка VIN, текст артикулов) из каталога или (None, None)."""
    if not vin or not os.environ.get('PARTSAPI_KEY'):
        return None, None
    car_id, decoded = decode_vin(vin.strip())
    if not car_id:
        return decoded, None
    car_type, nodes = load_tree(car_id)
    if not nodes:
        return decoded, None
    tree_text = '\n'.join(f'{k}: {v}' for k, v in nodes.items())[:30000]
    matched = deepseek(api_key, MATCH_PROMPT, f'Запчасти:\n{parts}\n\nГруппы каталога:\n{tree_text}')
    items = [i for i in matched.get('items', []) if isinstance(i, dict) and i.get('part')]
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(
            lambda i: fetch_articles(car_id, car_type, i['id']) if i.get('id') and str(i['id']) in nodes else [],
            items,
        ))
    lines = []
    for item, arts in zip(items, results):
        if arts:
            lines.append(f"{item['part']} — {', '.join(arts[:8])}")
        else:
            lines.append(f"{item['part']} — в каталоге не найдено, нужна проверка")
    return decoded, ('\n'.join(lines) if lines else None)


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
    lead_id = body.get('id')
    if not isinstance(lead_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    api_key = os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
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

        decoded, answer = None, None
        try:
            decoded, answer = catalog_articles(api_key, vin, parts)
        except Exception as e:
            print(f'catalog flow failed: {e}')
        source = 'catalog' if answer else 'ai'

        if not answer:
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
            f"UPDATE {schema}.leads SET ai_articles = %s, vin_decoded = %s WHERE id = %s",
            (answer, decoded or None, lead_id),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ai_articles': answer, 'vin_decoded': decoded or '', 'source': source})}
