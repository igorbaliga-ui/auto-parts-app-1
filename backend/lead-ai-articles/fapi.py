import gzip
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

FAPI_URL = 'https://fapi.iisis.ru/fapi/v2'
MAX_OE_PER_PART = 2
MAX_ANALOGS = 4
MAX_MODELS = 5


def fapi_enabled() -> bool:
    return bool(os.environ.get('FAPI_KEY'))


class FapiError(Exception):
    pass


def fapi_reason(code: int) -> str:
    if code == 402:
        return 'не хватает кредитов или баланса, нужна оплата'
    if code in (401, 403):
        return 'ключ не принят или нет доступа к методу'
    if code == 429:
        return 'исчерпан лимит запросов'
    if code == 503:
        return 'сервис временно недоступен'
    return f'ошибка {code}'


def fapi_get(path: str, params: dict, timeout: int = 6, step: str = '', strict: bool = False):
    url = f'{FAPI_URL}{path}?{urllib.parse.urlencode(params)}'
    req = urllib.request.Request(url, headers={
        'Authorization': f"Bearer {os.environ['FAPI_KEY']}",
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if resp.headers.get('Content-Encoding') == 'gzip':
                raw = gzip.decompress(raw)
            return json.loads(raw.decode('utf-8')) if raw else None
    except urllib.error.HTTPError as e:
        err = e.read()
        if e.headers.get('Content-Encoding') == 'gzip':
            try:
                err = gzip.decompress(err)
            except Exception:
                pass
        print(f'FAPI {path} {e.code}: {err.decode("utf-8", "ignore")[:300]}')
        if strict:
            raise FapiError(f'{step or path}: {fapi_reason(e.code)}')
    except Exception as e:
        print(f'FAPI {path} failed: {e}')
        if strict:
            raise FapiError(f'{step or path}: нет ответа')
    return None


def pick_candidate(candidates: list):
    oe = [c for c in candidates if c.get('oe')]
    pool = oe or candidates
    return pool[0] if pool else None


def part_card(number: str, mfi=None):
    params = {'n': number, 'limit': 50}
    if mfi:
        params['mfi'] = mfi
    card = fapi_get('/part', params)
    if not card:
        return None
    if not card.get('part') and card.get('candidates'):
        chosen = pick_candidate(card['candidates'])
        if not chosen:
            return None
        card = fapi_get('/part', {'n': number, 'mfi': chosen['mfi'], 'limit': 50})
    if not card or not card.get('part'):
        return None
    return card


def analogs_for(number: str, cache=None, mfi=None) -> dict:
    """Кроссы по номеру: {'mfi': ..., 'analogs': ['BRAND NUMBER', ...]}."""
    key = f'fapi:cross:{number}'
    hit = cache.get(key) if cache else None
    if hit is not None:
        return hit
    card = part_card(number, mfi)
    if not card:
        return {}
    seen = set()
    analogs = []
    for link in card.get('analogs') or []:
        if link.get('oe'):
            continue
        label = f"{link.get('ds', '')} {link.get('n', '')}".strip()
        if label and label not in seen:
            seen.add(label)
            analogs.append(label)
        if len(analogs) >= MAX_ANALOGS:
            break
    result = {'mfi': card['part'].get('mfi'), 'analogs': analogs}
    if cache:
        cache.put(key, result)
    return result


def applicability_for(mfi, number: str, cache=None) -> list:
    """Модели авто, к которым подходит деталь. Стоит 100 кредитов за запрос."""
    key = f'fapi:app:{mfi}:{number}'
    hit = cache.get(key) if cache else None
    if hit is not None:
        return hit.get('items', [])
    data = fapi_get('/productApplicabilityList', {'mfi': mfi, 'n': number}, timeout=8)
    if not data:
        return []
    brands = {m.get('i'): m.get('ds', '') for m in (data.get('manufacturerList') or {}).get('mf', [])}
    items = []
    for m in (data.get('modelList') or {}).get('m', []):
        label = f"{brands.get(m.get('mfi'), '')} {m.get('d', '')}".strip()
        if label and label not in items:
            items.append(label)
        if len(items) >= MAX_MODELS:
            break
    if cache:
        cache.put(key, {'items': items})
    return items


def enrich_line(part: str, arts: list, cache=None) -> str:
    """Строка по позиции: артикулы каталога + аналоги FAPI (+ применимость, если FAPI_APPLICABILITY=1)."""
    base = f"{part} — {', '.join(arts[:8])}"
    if not fapi_enabled():
        return base
    analogs = []
    models = []
    for number in arts[:MAX_OE_PER_PART]:
        info = analogs_for(number, cache)
        for a in info.get('analogs', []):
            if a not in analogs:
                analogs.append(a)
        if os.environ.get('FAPI_APPLICABILITY') == '1' and info.get('mfi') and not models:
            models = applicability_for(info['mfi'], number, cache)
    analogs = analogs[:MAX_ANALOGS]
    if analogs:
        base += f"; аналоги: {', '.join(analogs)}"
    if models:
        base += f"; подходит: {', '.join(models)}"
    return base


def clean_brand(name: str) -> str:
    return (name or '').strip()


def decode_text(v: dict) -> str:
    parts = [' '.join(x for x in [v.get('brand_name') or v.get('manufacturer'), v.get('model_name'), v.get('modification_name')] if x)]
    if v.get('engine_code'):
        parts.append(f"двигатель {v['engine_code']}")
    if v.get('model_year'):
        parts.append(f"{v['model_year']} г.")
    if v.get('country'):
        parts.append(v['country'])
    return ', '.join(p for p in parts if p)


def fapi_vin(vin: str, cache):
    key = f'fapi:vin:{vin}'
    hit = cache.get(key)
    if hit and hit.get('type_id'):
        return hit['type_id'], hit.get('text', '')
    data = fapi_get('/vin', {'vin': vin, 'lang': 'ru'}, timeout=8, step='расшифровка VIN (FAPI)', strict=True)
    if not isinstance(data, dict) or not data.get('dt_type_id'):
        raise FapiError('расшифровка VIN (FAPI): авто не найдено в каталоге')
    text = decode_text(data)
    cache.put(key, {'type_id': data['dt_type_id'], 'text': text})
    return data['dt_type_id'], text


def fapi_tree(type_id, cache) -> dict:
    key = f'fapi:tree:{type_id}'
    hit = cache.get(key)
    if hit and hit.get('nodes'):
        return hit['nodes']
    rows = fapi_get('/catalogList/dt/treeList', {'mi': type_id}, timeout=8, step='дерево групп (FAPI)', strict=True)
    rows = [r for r in (rows or []) if isinstance(r, dict) and r.get('i')]
    by_id = {r['i']: r for r in rows}
    parents = {r.get('pi') for r in rows}
    nodes = {}
    for r in rows:
        if r['i'] in parents:
            continue
        names, cur, guard = [], r, 0
        while cur and guard < 8:
            names.append(str(cur.get('d', '')))
            cur = by_id.get(cur.get('pi'))
            guard += 1
        nodes[str(r['i'])] = ' > '.join(reversed(names))
    if not nodes:
        raise FapiError('дерево групп (FAPI): для этого авто нет данных')
    cache.put(key, {'nodes': nodes})
    return nodes


def fetch_oem(type_id, node_id):
    rows = fapi_get('/catalogList/dt/productListOEM', {'modi': type_id, 'nodei': node_id}, timeout=10, step='оригинальные номера (FAPI)', strict=True)
    rows = [r for r in (rows or []) if isinstance(r, dict) and r.get('n')]
    direct = [r for r in rows if not r.get('fit')]
    return [{'mfi': r.get('mfi'), 'mfd': r.get('mfd', ''), 'n': r['n']} for r in (direct or rows)[:MAX_OE_PER_PART + 1]]


def fapi_catalog(vin: str, part_lines: list, shortlist_fn, cache):
    """Полный подбор через FAPI: (расшифровка VIN, текст, причина)."""
    from concurrent.futures import ThreadPoolExecutor
    type_id, decoded = fapi_vin(vin, cache)
    nodes = fapi_tree(type_id, cache)
    chosen = []
    for line in part_lines:
        found = shortlist_fn(nodes, [line], per_part=1)
        chosen.append((line, next(iter(found), None)))
    need = sorted({nid for _, nid in chosen if nid})
    oem_by_node = {}
    missing = []
    for nid in need:
        hit = cache.get(f'fapi:oem:{type_id}:{nid}')
        if hit is not None and 'items' in hit:
            oem_by_node[nid] = hit['items']
        else:
            missing.append(nid)
    if missing:
        with ThreadPoolExecutor(max_workers=5) as pool:
            fetched = list(pool.map(lambda n: fetch_oem(type_id, n), missing))
        for nid, items in zip(missing, fetched):
            oem_by_node[nid] = items
            cache.put(f'fapi:oem:{type_id}:{nid}', {'items': items})
    analog_jobs = []
    for _, nid in chosen:
        for o in (oem_by_node.get(nid) or [])[:MAX_OE_PER_PART]:
            analog_jobs.append(o)
    analogs_by_num = {}
    todo = []
    for o in analog_jobs:
        hit = cache.get(f"fapi:cross:{o['n']}")
        if hit is not None:
            analogs_by_num[o['n']] = hit.get('analogs', [])
        elif o['n'] not in todo:
            todo.append(o['n'])
    mfi_of = {o['n']: o.get('mfi') for o in analog_jobs}
    if todo:
        with ThreadPoolExecutor(max_workers=5) as pool:
            res = list(pool.map(lambda n: analogs_for(n, None, mfi_of.get(n)), todo))
        for n, info in zip(todo, res):
            analogs_by_num[n] = info.get('analogs', [])
            cache.put(f'fapi:cross:{n}', {'analogs': analogs_by_num[n]})
    lines = []
    found = 0
    for line, nid in chosen:
        oems = (oem_by_node.get(nid) or [])[:MAX_OE_PER_PART] if nid else []
        if not oems:
            lines.append(f'{line} — в каталоге не найдено, нужна проверка')
            continue
        found += 1
        text = f"{line} — " + ', '.join(f"{clean_brand(o['mfd'])} {o['n']}".strip() for o in oems)
        analogs = []
        for o in oems:
            for a in analogs_by_num.get(o['n'], []):
                if a not in analogs:
                    analogs.append(a)
        if analogs:
            text += f"; аналоги: {', '.join(analogs[:MAX_ANALOGS])}"
        lines.append(text)
    if not found:
        return decoded, None, 'FAPI: подходящих запчастей не найдено'
    return decoded, '\n'.join(lines), None


def fapi_usage() -> dict:
    """Проверка ключа FAPI: принят ли, доступ к VIN, остатки."""
    if not os.environ.get('FAPI_KEY'):
        return {'key': 'missing'}
    req = urllib.request.Request(f'{FAPI_URL}/usage', headers={
        'Authorization': f"Bearer {os.environ['FAPI_KEY']}",
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
    })
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read()
            if resp.headers.get('Content-Encoding') == 'gzip':
                raw = gzip.decompress(raw)
            data = json.loads(raw.decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'FAPI /usage {e.code}')
        return {'key': 'rejected', 'code': e.code}
    except Exception as e:
        print(f'FAPI /usage failed: {e}')
        return {'key': 'unavailable'}
    acc = data.get('account') or {}
    vin = data.get('vin') or {}
    return {
        'key': 'ok',
        'status': acc.get('st'),
        'status_text': acc.get('d'),
        'plan': acc.get('pl'),
        'credits_left': acc.get('rem'),
        'credits_total': acc.get('inc'),
        'balance_rub': (acc.get('bp') or 0) / 100 if acc.get('bp') is not None else None,
        'vin_access': vin.get('st'),
        'vin_balance_rub': vin['balance_kopecks'] / 100 if vin.get('balance_kopecks') is not None else None,
    }
