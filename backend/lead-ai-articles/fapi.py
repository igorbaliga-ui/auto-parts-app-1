import json
import os
import urllib.error
import urllib.parse
import urllib.request

FAPI_URL = 'https://fapi.iisis.ru/fapi/v2'
MAX_OE_PER_PART = 2
MAX_ANALOGS = 4
MAX_MODELS = 5


def fapi_enabled() -> bool:
    return bool(os.environ.get('FAPI_KEY'))


def fapi_get(path: str, params: dict, timeout: int = 6):
    url = f'{FAPI_URL}{path}?{urllib.parse.urlencode(params)}'
    req = urllib.request.Request(url, headers={'Authorization': f"Bearer {os.environ['FAPI_KEY']}", 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f'FAPI {path} {e.code}: {e.read().decode("utf-8", "ignore")[:200]}')
    except Exception as e:
        print(f'FAPI {path} failed: {e}')
    return None


def pick_candidate(candidates: list):
    oe = [c for c in candidates if c.get('oe')]
    pool = oe or candidates
    return pool[0] if pool else None


def part_card(number: str):
    card = fapi_get('/part', {'n': number, 'limit': 50})
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


def analogs_for(number: str, cache=None) -> dict:
    """Кроссы по номеру: {'mfi': ..., 'analogs': ['BRAND NUMBER', ...]}."""
    key = f'fapi:cross:{number}'
    hit = cache.get(key) if cache else None
    if hit is not None:
        return hit
    card = part_card(number)
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
