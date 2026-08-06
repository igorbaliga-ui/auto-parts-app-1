import json
import os
import re
import psycopg2
import psycopg2.extras


def handler(event: dict, context) -> dict:
    """Отдаёт заказы клиента по номеру телефона для личного кабинета «Гараж»"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    params = event.get('queryStringParameters') or {}
    phone = (params.get('phone') or '').strip()
    phone_digits = re.sub(r'\D', '', phone)

    if len(phone_digits) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    # Сравниваем по последним 10 цифрам, чтобы +7900..., 8900... и 900... считались одним номером
    phone_last10 = phone_digits[-10:]

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, vin, name, phone, parts, messenger, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived "
            f"FROM {schema}.leads WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
            f"ORDER BY created_at DESC LIMIT 100",
            (phone_last10,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    orders = []
    for r in rows:
        orders.append({
            'id': r['id'],
            'vin': r['vin'],
            'name': r['name'],
            'phone': r['phone'],
            'parts': r['parts'],
            'messenger': r['messenger'],
            'order_amount': float(r['order_amount']) if r['order_amount'] is not None else None,
            'prepayment': float(r['prepayment']) if r['prepayment'] is not None else None,
            'remaining': float(r['remaining']) if r['remaining'] is not None else None,
            # Кэшбэк начисляется только после того, как заказ переведён в статус «Выполнен»
            'cashback': float(r['cashback']) if r['cashback'] is not None and r['status'] == 'done' else None,
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'car_name': r['car_name'],
            'city': r['city'],
            'status': r['status'],
            'completed_at': r['completed_at'].isoformat() if r['completed_at'] else None,
            'arrived': bool(r['arrived']),
        })

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'orders': orders})}