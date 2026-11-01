import gzip
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

FAPI_URL = 'https://fapi.iisis.ru/fapi/v2'
MAX_OE_PER_PART = 2
MAX_OE_CANDIDATES = 25
MAX_ANALOGS = 4
MAX_MODELS = 5


def fapi_key() -> str:
    return os.environ.get('FAPI_KEY', '').strip().strip('"').strip("'")


def fapi_enabled() -> bool:
    return bool(fapi_key())


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
        'Authorization': f"Bearer {fapi_key()}",
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
        brand = str(link.get('ds', '')).strip().upper()
        if label and brand not in seen:
            seen.add(brand)
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


MULTI_WORD_BRANDS = ('FEBI BILSTEIN', 'HENGST FILTER', 'VICTOR REINZ', '1A FIRST AUTOMOTIVE', 'MANN FILTER', 'KAWE SPORT', 'BLUE PRINT', 'JAPAN CARS', 'SWAG AUTOMOTIVE', 'TRICLO PARTS')


def brand_of(label: str) -> str:
    up = label.strip().upper()
    for b in MULTI_WORD_BRANDS:
        if up.startswith(b + ' '):
            return b
    return up.split(' ', 1)[0]


def one_per_brand(items: list, limit: int = 0) -> list:
    seen, out = set(), []
    for it in items:
        b = brand_of(it)
        if b in seen:
            continue
        seen.add(b)
        out.append(it)
        if limit and len(out) >= limit:
            break
    return out


def format_block(part: str, originals: list, analogs: list, models=None) -> str:
    rows = [part]
    rows.extend(originals)
    if analogs:
        rows.append('Аналоги:')
        rows.extend(analogs)
    if models:
        rows.append('Подходит: ' + ', '.join(models))
    return '\n'.join(rows)


def enrich_line(part: str, arts: list, cache=None) -> str:
    """Строка по позиции: артикулы каталога + аналоги FAPI (+ применимость, если FAPI_APPLICABILITY=1)."""
    if not fapi_enabled():
        return format_block(part, arts[:8], [])
    analogs = []
    models = []
    for number in arts[:MAX_OE_PER_PART]:
        info = analogs_for(number, cache)
        for a in info.get('analogs', []):
            if a not in analogs:
                analogs.append(a)
        if os.environ.get('FAPI_APPLICABILITY') == '1' and info.get('mfi') and not models:
            models = applicability_for(info['mfi'], number, cache)
    return format_block(part, arts[:8], one_per_brand(analogs, MAX_ANALOGS), models)


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
    try:
        data = fapi_get('/vin', {'vin': vin, 'lang': 'ru'}, timeout=10, step='расшифровка VIN (FAPI)', strict=True)
    except FapiError as e:
        if 'нет ответа' not in str(e):
            raise
        data = fapi_get('/vin', {'vin': vin, 'lang': 'ru'}, timeout=10, step='расшифровка VIN (FAPI)', strict=True)
    if not isinstance(data, dict) or not data.get('dt_type_id'):
        print(f'FAPI /vin without dt_type_id: {json.dumps(data, ensure_ascii=False)[:600]}')
        known = decode_text(data) if isinstance(data, dict) else ''
        conf = data.get('confidence') if isinstance(data, dict) else None
        raise FapiError(f'расшифровка VIN (FAPI): точную модификацию не определил ({known or "авто неизвестно"}; точность: {conf})')
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
    print(f'FAPI OEM rows node {node_id} total {len(rows)}: {json.dumps(rows[:20], ensure_ascii=False)[:2500]}')
    direct = [r for r in rows if not r.get('fit')]
    out = []
    for r in (direct or rows)[:MAX_OE_CANDIDATES]:
        extra = {k: v for k, v in r.items() if k not in ('n', 'mfi', 'mfd', 'fit') and v not in (None, '', [], {})}
        out.append({'mfi': r.get('mfi'), 'mfd': r.get('mfd', ''), 'n': r['n'], 'x': extra})
    return out


def fapi_options(vin: str, part_lines: list, shortlist_fn, cache) -> list:
    type_id, _ = fapi_vin(vin, cache)
    nodes = fapi_tree(type_id, cache)
    out = []
    for line in part_lines:
        cand = shortlist_fn(nodes, [line], per_part=15)
        out.append({'part': line, 'options': [{'id': k, 'name': v} for k, v in cand.items()]})
    return out


def fapi_catalog(vin: str, part_lines: list, shortlist_fn, cache, pick_fn=None, overrides=None, filter_fn=None):
    """Полный подбор через FAPI: (расшифровка VIN, текст, причина)."""
    from concurrent.futures import ThreadPoolExecutor
    type_id, decoded = fapi_vin(vin, cache)
    nodes = fapi_tree(type_id, cache)
    per_line = {line: shortlist_fn(nodes, [line], per_part=12) for line in part_lines}
    union = {}
    for cand in per_line.values():
        union.update(cand)
    picked = {}
    if pick_fn and union:
        try:
            picked = pick_fn(part_lines, union) or {}
        except Exception as e:
            print(f'AI pick failed: {e}')
    by_str = {str(k): k for k in union}
    chosen = []
    for line in part_lines:
        cand = per_line[line]
        pid = picked.get(line)
        nid = by_str.get(str(pid)) if pid is not None else None
        if nid is None or nid not in cand:
            nid = next(iter(cand), None) if not picked else None
        forced = (overrides or {}).get(line)
        if forced is not None and str(forced) in nodes:
            nid = str(forced)
        print(f'FAPI group for "{line}": {nid} {nodes.get(nid) if nid is not None else ""}')
        chosen.append((line, nid))
    need = sorted({nid for _, nid in chosen if nid})
    oem_by_node = {}
    missing = []
    for nid in need:
        hit = cache.get(f'fapi:oem2:{type_id}:{nid}')
        if hit is not None and 'items' in hit:
            oem_by_node[nid] = hit['items']
        else:
            missing.append(nid)
    if missing:
        with ThreadPoolExecutor(max_workers=5) as pool:
            fetched = list(pool.map(lambda n: fetch_oem(type_id, n), missing))
        for nid, items in zip(missing, fetched):
            oem_by_node[nid] = items
            cache.put(f'fapi:oem2:{type_id}:{nid}', {'items': items})
    oems_of = {}
    for line, nid in chosen:
        rows = oem_by_node.get(nid) or [] if nid else []
        sel = None
        if filter_fn and len(rows) > 1:
            try:
                sel = filter_fn(line, nodes.get(nid, ''), rows, decoded)
            except Exception as e:
                print(f'AI oem filter failed: {e}')
        if sel is None:
            sel = rows[:MAX_OE_PER_PART]
        print(f'FAPI OEM for "{line}": {[o["n"] for o in sel]} из {len(rows)}')
        oems_of[line] = sel
    analog_jobs = []
    for line, _ in chosen:
        analog_jobs.extend(oems_of.get(line) or [])
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
        oems = oems_of.get(line) or []
        if not oems:
            lines.append(f'{line} — в каталоге не найдено, нужна проверка')
            continue
        found += 1
        originals = [f"{clean_brand(o['mfd'])} {o['n']}".strip() for o in oems]
        analogs = []
        for o in oems:
            for a in analogs_by_num.get(o['n'], []):
                if a not in analogs:
                    analogs.append(a)
        lines.append(format_block(line, originals, one_per_brand(analogs, MAX_ANALOGS)))
    if not found:
        return decoded, None, 'FAPI: подходящих запчастей не найдено'
    return decoded, '\n\n'.join(lines), None


def fapi_usage() -> dict:
    """Проверка ключа FAPI: принят ли, доступ к VIN, остатки."""
    if not fapi_key():
        return {'key': 'missing'}
    req = urllib.request.Request(f'{FAPI_URL}/usage', headers={
        'Authorization': f"Bearer {fapi_key()}",
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
