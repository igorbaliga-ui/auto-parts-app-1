import json
import re


def handler(event: dict, context) -> dict:
    """Отдаёт веб-манифест PWA со start_url, содержащим реферальный код друга
    (?ref=CODE в query). iOS Safari («Добавить на экран Домой») и Chrome на
    Android («Установить приложение») читают start_url из файла манифеста в
    момент добавления ярлыка на рабочий стол — обычный статичный файл манифеста
    не может содержать код конкретного посетителя, поэтому для реферальных
    переходов используется этот отдельный сетевой адрес манифеста вместо
    /manifest.webmanifest."""
    method = event.get('httpMethod', 'GET')

    headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/manifest+json',
    }

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    params = event.get('queryStringParameters') or {}
    raw_ref = (params.get('ref') or '').strip().upper()
    ref = re.sub(r'[^A-Z0-9]', '', raw_ref)[:32]

    start_url = f'/?ref={ref}' if ref else '/'

    manifest = {
        'id': '/',
        'name': 'ЗАП Оптом — автозапчасти по VIN',
        'short_name': 'ЗАП Оптом',
        'description': 'Подбор автозапчастей по VIN-коду: оригинал и аналоги, опт и розница',
        'start_url': start_url,
        'scope': '/',
        'display': 'standalone',
        'background_color': '#0e0e0f',
        'theme_color': '#0e0e0f',
        'orientation': 'portrait-primary',
        'lang': 'ru',
        'icons': [
            {'src': '/pwa-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
            {'src': '/pwa-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
            {'src': '/pwa-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
            {'src': '/pwa-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
    }

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps(manifest, ensure_ascii=False)}
