import json
import os
import psycopg2


def handler(event: dict, context) -> dict:
    """Обновляет сумму заказа и кэшбэк по заявке (для менеджера в /admin)"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    lead_id = body.get('id')
    order_amount = body.get('order_amount')
    status = body.get('status')

    if not isinstance(lead_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    if status is not None and status not in ('in_progress', 'done'):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный статус'})}

    # Кэшбэк — вычисляемая колонка в БД (3% от order_amount), пересчитывается автоматически

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        if status is not None:
            cur.execute(
                f"UPDATE {schema}.leads SET order_amount = %s, status = %s WHERE id = %s RETURNING cashback",
                (order_amount, status, lead_id),
            )
        else:
            cur.execute(
                f"UPDATE {schema}.leads SET order_amount = %s WHERE id = %s RETURNING cashback",
                (order_amount, lead_id),
            )
        row = cur.fetchone()
        cashback = float(row[0]) if row and row[0] is not None else None
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'cashback': cashback})}