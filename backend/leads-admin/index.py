import json
import os
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Отдаёт список заявок с сайта по паролю (для страницы /admin).
    Перед выдачей автоматически переносит в архив заявки со статусом «Новая» (new),
    которые провисели без действий менеджера дольше 14 дней."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'leads-admin', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Автоархивация: заявки в статусе «Новая», которые за 14 дней так и не взяли в работу
        cur.execute(
            f"UPDATE {schema}.leads SET archived = true, archived_at = now() "
            f"WHERE status = 'new' AND archived = false AND created_at < now() - INTERVAL '14 days'"
        )
        conn.commit()

        cur.execute(
            f"SELECT id, vin, name, phone, parts, messenger, photo_url, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived, internal_note, archived "
            f"FROM {schema}.leads ORDER BY created_at DESC LIMIT 500"
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    leads = []
    for r in rows:
        leads.append({
            'id': r['id'],
            'vin': r['vin'],
            'name': r['name'],
            'phone': r['phone'],
            'parts': r['parts'],
            'messenger': r['messenger'],
            'photo_url': r['photo_url'],
            'order_amount': float(r['order_amount']) if r['order_amount'] is not None else None,
            'prepayment': float(r['prepayment']) if r['prepayment'] is not None else None,
            'remaining': float(r['remaining']) if r['remaining'] is not None else None,
            'cashback': float(r['cashback']) if r['cashback'] is not None else None,
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'car_name': r['car_name'],
            'city': r['city'],
            'status': r['status'],
            'completed_at': r['completed_at'].isoformat() if r['completed_at'] else None,
            'arrived': bool(r['arrived']),
            'internal_note': r['internal_note'],
            'archived': bool(r['archived']),
        })

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'leads': leads})}