import json
import os
import re
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def handler(event: dict, context) -> dict:
    """Заметка менеджера, привязанная к номеру телефона клиента (а не к конкретной заявке) —
    видна во всех заявках этого номера, включая будущие. Позволяет получить заметку по телефону
    и сохранить/обновить/удалить её (для /admin)."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'client-notes', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone_last10 = normalize_phone(params.get('phone') or '')
        if len(phone_last10) < 10:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                f"SELECT note, admin_name, updated_at FROM {schema}.client_notes WHERE phone_last10 = %s",
                (phone_last10,),
            )
            row = cur.fetchone()
            cur.close()
        finally:
            conn.close()

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'note': row['note'] if row else None,
                'admin_name': row['admin_name'] if row else None,
                'updated_at': row['updated_at'].isoformat() if row and row['updated_at'] else None,
            }),
        }

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    phone_last10 = normalize_phone(body.get('phone') or '')
    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    note = (body.get('note') or '').strip()
    admin_name = (body.get('admin_name') or '').strip() or 'Менеджер'

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        if note:
            cur.execute(
                f"INSERT INTO {schema}.client_notes (phone_last10, note, admin_name, updated_at) "
                f"VALUES (%s, %s, %s, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET note = EXCLUDED.note, "
                f"admin_name = EXCLUDED.admin_name, updated_at = now()",
                (phone_last10, note, admin_name),
            )
        else:
            # Пустая заметка — удаляем запись, чтобы не хранить лишнее
            cur.execute(
                f"DELETE FROM {schema}.client_notes WHERE phone_last10 = %s",
                (phone_last10,),
            )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
