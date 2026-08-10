import json
import os
import psycopg2
from send_push import send_push_to_phone
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Отправляет менеджером индивидуальное текстовое Web Push уведомление конкретному
    клиенту по id его заявки. Требует пароль администратора. Возвращает количество
    устройств клиента, на которые уведомление было доставлено (0 — клиент не подписан
    на уведомления ни на одном устройстве)."""
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

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'admin-send-push', max_requests=30, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    body = json.loads(event.get('body') or '{}')
    lead_id = body.get('id')
    message = (body.get('message') or '').strip()

    if not isinstance(lead_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    if not message:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите текст сообщения'})}

    if len(message) > 500:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Сообщение слишком длинное (максимум 500 символов)'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT phone FROM {schema}.leads WHERE id = %s", (lead_id,))
        row = cur.fetchone()
        cur.close()
        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Заявка не найдена'})}
        phone = row[0]
    finally:
        conn.close()

    sent = send_push_to_phone(dsn, schema, phone, title='Сообщение от менеджера', body=message)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'success': True, 'sent': sent}),
    }
