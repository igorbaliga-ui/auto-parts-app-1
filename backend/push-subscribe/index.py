import json
import os
import re
import psycopg2

def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def handler(event: dict, context) -> dict:
    """Сохраняет или удаляет подписку браузера клиента на Web Push уведомления,
    привязанную к номеру телефона (для личного кабинета «Гараж»)"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method == 'GET':
        # Отдаёт публичный VAPID-ключ фронтенду для оформления подписки
        public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'public_key': public_key})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'subscribe')
    phone_last10 = normalize_phone(body.get('phone') or '')

    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()

        if action == 'unsubscribe':
            endpoint = body.get('endpoint') or ''
            cur.execute(f"DELETE FROM {schema}.push_subscriptions WHERE endpoint = %s", (endpoint,))
            conn.commit()
            cur.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        subscription = body.get('subscription') or {}
        endpoint = subscription.get('endpoint')
        keys = subscription.get('keys') or {}
        p256dh = keys.get('p256dh')
        auth = keys.get('auth')

        if not endpoint or not p256dh or not auth:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректные данные подписки'})}

        cur.execute(
            f"INSERT INTO {schema}.push_subscriptions (phone_last10, endpoint, p256dh, auth) "
            f"VALUES (%s, %s, %s, %s) "
            f"ON CONFLICT (endpoint) DO UPDATE SET phone_last10 = EXCLUDED.phone_last10, "
            f"p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth",
            (phone_last10, endpoint, p256dh, auth),
        )
        conn.commit()
        cur.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
    finally:
        conn.close()