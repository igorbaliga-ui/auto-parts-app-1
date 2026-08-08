import json
import os
import re
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Отдаёт заказы клиента по номеру телефона для личного кабинета «Гараж».
    Перед выдачей автоматически переносит в архив заявки со статусом «Новая» (new),
    которые провисели без действий менеджера дольше 14 дней."""
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

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от перебора чужих номеров телефона: не более 120 запросов с одного IP за 5 минут.
    # Лимит выше, чем у других публичных функций, так как этот эндпоинт легитимно
    # вызывается несколько раз за одну сессию (шапка сайта, форма заявки, сама страница «Гараж»)
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'garage-lookup', max_requests=120, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    params = event.get('queryStringParameters') or {}
    phone = (params.get('phone') or '').strip()
    phone_digits = re.sub(r'\D', '', phone)

    if len(phone_digits) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    # Сравниваем по последним 10 цифрам, чтобы +7900..., 8900... и 900... считались одним номером
    phone_last10 = phone_digits[-10:]

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
            f"SELECT id, vin, name, phone, parts, messenger, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived, archived, in_progress_at, arrived_at "
            f"FROM {schema}.leads WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
            f"ORDER BY created_at DESC LIMIT 100",
            (phone_last10,),
        )
        rows = cur.fetchall()

        # Списания кэшбэка менеджером — вычитаются из общей суммы, видной клиенту
        cur.execute(
            f"SELECT id, amount, created_at FROM {schema}.client_cashback_deductions "
            f"WHERE phone_last10 = %s ORDER BY created_at DESC",
            (phone_last10,),
        )
        deduction_rows = cur.fetchall()
        cashback_deducted = sum(float(d['amount']) for d in deduction_rows)
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
            # Предварительный расчёт кэшбэка для заказов «В работе» — покажем клиенту, сколько начислим по завершении
            'pending_cashback': float(r['cashback']) if r['cashback'] is not None and r['status'] == 'in_progress' else None,
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'car_name': r['car_name'],
            'city': r['city'],
            'status': r['status'],
            'completed_at': r['completed_at'].isoformat() if r['completed_at'] else None,
            'arrived': bool(r['arrived']),
            'archived': bool(r['archived']),
            'in_progress_at': r['in_progress_at'].isoformat() if r['in_progress_at'] else None,
            'arrived_at': r['arrived_at'].isoformat() if r['arrived_at'] else None,
        })

    # Подробная история операций с кэшбэком: начисления за выполненные заказы + списания менеджером
    cashback_history = []
    for r in rows:
        if r['status'] == 'done' and r['cashback'] is not None:
            car_label = r['car_name'] or r['vin'] or 'заказ'
            cashback_history.append({
                'type': 'accrual',
                'amount': float(r['cashback']),
                'label': f'Начислено за заказ: {car_label}',
                'created_at': (r['completed_at'] or r['created_at']).isoformat()
                if (r['completed_at'] or r['created_at']) else None,
            })
    for d in deduction_rows:
        cashback_history.append({
            'type': 'deduction',
            'amount': float(d['amount']),
            'label': 'Списание',
            'created_at': d['created_at'].isoformat() if d['created_at'] else None,
        })
    cashback_history.sort(key=lambda h: h['created_at'] or '', reverse=True)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'orders': orders,
            'cashback_deducted': cashback_deducted,
            'cashback_history': cashback_history,
        }),
    }