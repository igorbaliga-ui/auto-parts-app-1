import json
import os
import urllib.error
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

        user_text = f"VIN: {vin or 'не указан'}\nАвто: {car_name or 'не указано'}\nЗапчасти: {parts}"
        payload = {
            'model': 'deepseek-chat',
            'temperature': 0.2,
            'response_format': {'type': 'json_object'},
            'messages': [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user', 'content': user_text},
            ],
        }
        req = urllib.request.Request(
            'https://api.deepseek.com/chat/completions',
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        )
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                data = json.loads(resp.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            details = e.read().decode('utf-8', 'ignore')[:500]
            print(f'AI error {e.code}: {details}')
            return {'statusCode': 502, 'headers': headers, 'body': json.dumps({'error': f'ИИ отклонил запрос ({e.code})'})}
        content = data['choices'][0]['message']['content'].strip()
        try:
            parsed = json.loads(content)
            answer = str(parsed.get('articles') or '').strip() or content
            decoded = str(parsed.get('decoded') or '').strip()
        except ValueError:
            answer, decoded = content, ''

        cur.execute(
            f"UPDATE {schema}.leads SET ai_articles = %s, vin_decoded = %s WHERE id = %s",
            (answer, decoded or None, lead_id),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ai_articles': answer, 'vin_decoded': decoded})}
