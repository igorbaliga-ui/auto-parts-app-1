import json
import os
import psycopg2
from pywebpush import webpush, WebPushException
from rate_limit import get_client_ip, check_rate_limit


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

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от подбора пароля администратора: не более 30 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'admin-push-subscribe', max_requests=30, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action', 'subscribe')

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()

        if action == 'unsubscribe':
            endpoint = body.get('endpoint') or ''
            cur.execute(f"DELETE FROM {schema}.admin_push_subscriptions WHERE endpoint = %s", (endpoint,))
            conn.commit()
            cur.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'test':
            # Отправляет тестовый пуш только на ЭТО устройство (не всем менеджерам) —
            # кнопка «Проверить уведомления» в /admin, чтобы убедиться, что пуши доходят,
            # не дожидаясь новой заявки.
            subscription = body.get('subscription') or {}
            endpoint = subscription.get('endpoint')
            keys = subscription.get('keys') or {}
            p256dh = keys.get('p256dh')
            auth = keys.get('auth')
            if not endpoint or not p256dh or not auth:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Подписка не найдена. Сначала включите уведомления'})}
            private_key = os.environ.get('VAPID_PRIVATE_KEY')
            if not private_key:
                return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'VAPID-ключ не настроен на сервере'})}
            try:
                webpush(
                    subscription_info={'endpoint': endpoint, 'keys': {'p256dh': p256dh, 'auth': auth}},
                    data=json.dumps({'title': 'Тестовое уведомление', 'body': 'Если вы это видите — push работает', 'url': '/admin'}),
                    vapid_private_key=private_key,
                    vapid_claims={'sub': 'mailto:zapoptom@bk.ru'},
                    ttl=86400,
                    headers={'Urgency': 'high'},
                )
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
            except WebPushException as e:
                status_code = getattr(e.response, 'status_code', None)
                detail = getattr(e.response, 'text', None) or str(e)
                return {'statusCode': 502, 'headers': headers, 'body': json.dumps({'error': f'Не удалось отправить (код {status_code}): {detail}'[:300]})}

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