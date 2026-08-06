import json
import os
import re

import psycopg2
import psycopg2.extras


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def handler(event: dict, context) -> dict:
    """Считает суммарный кэшбэк клиента (3% от выполненных заказов минус списания) и
    позволяет менеджеру списать часть кэшбэка по номеру телефона (для /admin).
    Новые начисления (выполненные заказы) продолжают суммироваться в общий кэшбэк,
    списания вычитаются из него. Клиент в «Гараже» видит итоговую сумму."""
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

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone_param = params.get('phone')

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

            if phone_param:
                # История списаний по конкретному клиенту
                phone_last10 = normalize_phone(phone_param)
                cur.execute(
                    f"SELECT id, amount, admin_name, created_at FROM {schema}.client_cashback_deductions "
                    f"WHERE phone_last10 = %s ORDER BY created_at DESC LIMIT 200",
                    (phone_last10,),
                )
                rows = cur.fetchall()
                cur.close()
                history = [{
                    'id': r['id'],
                    'amount': float(r['amount']),
                    'admin_name': r['admin_name'],
                    'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                } for r in rows]
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'history': history})}

            # Список всех клиентов со сводкой по кэшбэку
            cur.execute(
                f"SELECT RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_last10, "
                f"MAX(name) AS name, SUM(CASE WHEN status = 'done' THEN cashback ELSE 0 END) AS accrued "
                f"FROM {schema}.leads GROUP BY 1"
            )
            rows = cur.fetchall()

            cur.execute(
                f"SELECT phone_last10, COALESCE(SUM(amount), 0) AS deducted "
                f"FROM {schema}.client_cashback_deductions GROUP BY 1"
            )
            deducted_map = {r['phone_last10']: float(r['deducted']) for r in cur.fetchall()}
            cur.close()
        finally:
            conn.close()

        clients = []
        for r in rows:
            phone_last10 = r['phone_last10']
            if not phone_last10:
                continue
            accrued = float(r['accrued']) if r['accrued'] is not None else 0
            deducted = deducted_map.get(phone_last10, 0)
            clients.append({
                'phone_last10': phone_last10,
                'name': r['name'],
                'accrued': accrued,
                'deducted': deducted,
                'total_cashback': accrued - deducted,
            })

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'clients': clients})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    phone_last10 = normalize_phone(body.get('phone') or '')
    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}

    amount = body.get('amount')
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректная сумма'})}

    if amount <= 0:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Сумма списания должна быть больше нуля'})}

    admin_name = (body.get('admin_name') or '').strip() or 'Менеджер'

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {schema}.client_cashback_deductions (phone_last10, amount, admin_name) "
            f"VALUES (%s, %s, %s)",
            (phone_last10, amount, admin_name),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}