import json
import os
import psycopg2
import psycopg2.extras


def handler(event: dict, context) -> dict:
    """Отдаёт список заявок с сайта по паролю (для страницы /admin)"""
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

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, vin, name, phone, parts, messenger, photo_url, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived "
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
        })

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'leads': leads})}