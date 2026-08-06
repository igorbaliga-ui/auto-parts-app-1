import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Сохраняет или удаляет подписку браузера менеджера на Web Push уведомления
    о новых заявках в /admin (устанавливается как приложение на телефон)"""
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

    if method == 'GET':
        # Отдаёт публичный VAPID-ключ фронтенду для оформления подписки
        public_key = os.environ.get('VAPID_PUBLIC_KEY', '')
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'public_key': public_key})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'subscribe')

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()

        if action == 'unsubscribe':
            endpoint = body.get('endpoint') or ''
            cur.execute(f"DELETE FROM {schema}.admin_push_subscriptions WHERE endpoint = %s", (endpoint,))
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
            f"INSERT INTO {schema}.admin_push_subscriptions (endpoint, p256dh, auth) "
            f"VALUES (%s, %s, %s) "
            f"ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth",
            (endpoint, p256dh, auth),
        )
        conn.commit()
        cur.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
    finally:
        conn.close()