import json
import os
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


SOCIAL_FIELDS = ['whatsapp_href', 'telegram_href', 'vk_href', 'instagram_href', 'website_value', 'website_href']
REQUIRED_FIELDS = ['phone_value', 'phone_href', 'email_value', 'email_href', 'address_value', 'hours_value']
BOOL_FIELDS = ['floating_button_visible']


def handler(event: dict, context) -> dict:
    """Отдаёт публичные контакты сайта (телефон, почта, адрес, часы работы, ссылки на
    соцсети/мессенджеры) — GET доступен всем без пароля (используется на главной странице).
    Изменить контакты может только администратор через POST с паролем (используется на
    странице /admin). Ссылки на соцсети необязательны — пустое значение убирает иконку с сайта."""
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

    if method == 'GET':
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                f"SELECT phone_value, phone_href, email_value, email_href, address_value, hours_value, "
                f"whatsapp_href, telegram_href, vk_href, instagram_href, website_value, website_href, "
                f"floating_button_visible "
                f"FROM {schema}.site_contacts WHERE id = 1"
            )
            row = cur.fetchone()
            cur.close()
        finally:
            conn.close()

        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Контакты не найдены'})}

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(dict(row))}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    # Защита от подбора пароля администратора: не более 30 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'site-contacts', max_requests=30, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')

    values = {}
    for field in REQUIRED_FIELDS:
        if field in body:
            value = (body[field] or '').strip()
            if not value:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Поля не могут быть пустыми'})}
            values[field] = value

    # Ссылки на соцсети необязательны — пустая строка сохраняется как NULL и убирает
    # иконку с сайта, не блокируя сохранение остальных полей
    for field in SOCIAL_FIELDS:
        if field in body:
            value = (body[field] or '').strip()
            values[field] = value or None

    for field in BOOL_FIELDS:
        if field in body:
            values[field] = bool(body[field])

    if not values:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нечего сохранять'})}

    set_clauses = [f"{f} = %s" for f in values]
    params = list(values.values())

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {schema}.site_contacts SET {', '.join(set_clauses)}, updated_at = now() WHERE id = 1",
            params,
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}