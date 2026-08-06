import json
import os
import psycopg2
from send_push import send_push_to_phone

def handler(event: dict, context) -> dict:
    """Обновляет сумму заказа, статус и пометку «Поступил» по заявке (для менеджера в /admin).
    При простановке пометки «Поступил» или переводе в статус «Выполнен» отправляет клиенту Web Push уведомление."""
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
    arrived = body.get('arrived')

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
            # При переводе в «Выполнен» фиксируем дату/время выполнения.
            # При возврате в «В работе» — сбрасываем её.
            if status == 'done':
                cur.execute(
                    f"UPDATE {schema}.leads SET order_amount = %s, status = %s, "
                    f"completed_at = COALESCE(completed_at, now()) WHERE id = %s "
                    f"RETURNING cashback, completed_at, phone, car_name, vin",
                    (order_amount, status, lead_id),
                )
            else:
                cur.execute(
                    f"UPDATE {schema}.leads SET order_amount = %s, status = %s, completed_at = NULL "
                    f"WHERE id = %s RETURNING cashback, completed_at, phone, car_name, vin",
                    (order_amount, status, lead_id),
                )
        elif arrived is not None:
            if arrived:
                cur.execute(
                    f"UPDATE {schema}.leads SET order_amount = %s, arrived = true, "
                    f"arrived_at = COALESCE(arrived_at, now()) WHERE id = %s "
                    f"RETURNING cashback, completed_at, phone, car_name, vin",
                    (order_amount, lead_id),
                )
            else:
                cur.execute(
                    f"UPDATE {schema}.leads SET order_amount = %s, arrived = false, arrived_at = NULL "
                    f"WHERE id = %s RETURNING cashback, completed_at, phone, car_name, vin",
                    (order_amount, lead_id),
                )
        else:
            cur.execute(
                f"UPDATE {schema}.leads SET order_amount = %s WHERE id = %s "
                f"RETURNING cashback, completed_at, phone, car_name, vin",
                (order_amount, lead_id),
            )
        row = cur.fetchone()
        cashback = float(row[0]) if row and row[0] is not None else None
        completed_at = row[1].isoformat() if row and row[1] else None
        conn.commit()
        cur.close()

        # Уведомляем клиента о смене статуса заказа
        if row:
            phone, car_name, vin = row[2], row[3], row[4]
            car_label = car_name or vin or 'ваш заказ'
            if arrived is True:
                send_push_to_phone(
                    dsn, schema, phone,
                    title='Деталь поступила',
                    body=f'{car_label}: заказанная деталь поступила и ждёт вас.',
                )
            elif status == 'done':
                send_push_to_phone(
                    dsn, schema, phone,
                    title='Заказ выполнен',
                    body=f'{car_label}: заказ выполнен. Спасибо, что выбрали нас!',
                )
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'success': True, 'cashback': cashback, 'completed_at': completed_at}),
    }