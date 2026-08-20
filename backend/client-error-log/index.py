import json
import os
import psycopg2
import psycopg2.extras
from send_admin_push import send_push_to_admins
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Журнал сбоев приложения на устройствах клиентов (ошибки рендера React, перехваченные
    ErrorBoundary на фронтенде). POST без пароля — принимает отчёт об ошибке от клиента,
    сохраняет в client_app_errors и сразу шлёт push менеджерам. GET и POST action=resolve —
    просмотр и разбор журнала в /admin, доступ только по паролю администратора."""
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

    if method not in ('GET', 'POST'):
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    client_ip = get_client_ip(event)

    if method == 'POST':
        body = json.loads(event.get('body') or '{}')
        req_headers = event.get('headers') or {}
        admin_password_header = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
        action = body.get('action')

        # Разбор случая менеджером — требует пароль администратора
        if action == 'resolve':
            admin_password = os.environ.get('ADMIN_PASSWORD')
            if not admin_password or admin_password_header != admin_password:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}
            error_id = body.get('id')
            if not isinstance(error_id, int):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id'})}
            conn = psycopg2.connect(dsn)
            try:
                cur = conn.cursor()
                cur.execute(
                    f"UPDATE {schema}.client_app_errors SET resolved = true WHERE id = %s",
                    (error_id,),
                )
                conn.commit()
                cur.close()
            finally:
                conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        # Отчёт об ошибке от клиента — без пароля, но с защитой от спама: не более
        # 20 отчётов с одного IP за 5 минут (падение может повторяться на цикле рендера)
        if not check_rate_limit(dsn, schema, client_ip, 'client-error-log', max_requests=20, window_seconds=300):
            return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов'})}

        message = (body.get('message') or '').strip()[:2000]
        stack = (body.get('stack') or '').strip()[:4000] or None
        url = (body.get('url') or '').strip()[:500] or None
        user_agent = (body.get('user_agent') or '').strip()[:500] or None

        if not message:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пустое сообщение об ошибке'})}

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {schema}.client_app_errors (message, stack, url, user_agent) "
                f"VALUES (%s, %s, %s, %s)",
                (message, stack, url, user_agent),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()

        try:
            send_push_to_admins(
                dsn, schema,
                title='Приложение упало у клиента',
                body=(f'{message}' + (f' — {url}' if url else ''))[:300],
                url='/admin',
            )
        except Exception:
            pass

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    # GET: список ошибок для /admin — требует пароль администратора
    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    if not check_rate_limit(dsn, schema, client_ip, 'client-error-log-get', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, message, stack, url, user_agent, resolved, created_at "
            f"FROM {schema}.client_app_errors ORDER BY created_at DESC LIMIT 200"
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    errors = [{
        'id': r['id'],
        'message': r['message'],
        'stack': r['stack'],
        'url': r['url'],
        'user_agent': r['user_agent'],
        'resolved': bool(r['resolved']),
        'created_at': r['created_at'].isoformat() if r['created_at'] else None,
    } for r in rows]

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'errors': errors})}
