import json
import os
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Журнал ошибок при отправке заявок клиентами (для /admin): GET отдаёт последние
    записи из lead_submit_errors, POST с action=resolve помечает запись отработанной
    (менеджер разобрался со случаем). Доступ только по паролю администратора."""
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

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'lead-errors', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    if method == 'GET':
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            cur.execute(
                f"SELECT id, phone, error_message, resolved, created_at "
                f"FROM {schema}.lead_submit_errors ORDER BY created_at DESC LIMIT 200"
            )
            rows = cur.fetchall()
            cur.close()
        finally:
            conn.close()

        errors = [{
            'id': r['id'],
            'phone': r['phone'],
            'error_message': r['error_message'],
            'resolved': bool(r['resolved']),
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
        } for r in rows]

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'errors': errors})}

    # POST: пометить запись отработанной
    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    error_id = body.get('id')

    if action != 'resolve':
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Неизвестное действие'})}
    if not isinstance(error_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {schema}.lead_submit_errors SET resolved = true WHERE id = %s",
            (error_id,),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
