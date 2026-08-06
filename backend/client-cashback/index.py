import json
import os
import re
import psycopg2


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def handler(event: dict, context) -> dict:
    """Считает суммарный кэшбэк клиента (3% от выполненных заказов) и позволяет
    менеджеру вручную задать итоговую сумму кэшбэка по номеру телефона (для /admin).
    Если задано ручное значение — оно приоритетнее автоматического расчёта и
    именно оно показывается клиенту в «Гараже»."""
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
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_last10, "
                f"MAX(name) AS name, SUM(CASE WHEN status = 'done' THEN cashback ELSE 0 END) AS auto_cashback "
                f"FROM {schema}.leads GROUP BY 1"
            )
            rows = cur.fetchall()
            cur.execute(f"SELECT phone_last10, cashback_override FROM {schema}.client_cashback_overrides")
            overrides = {r[0]: float(r[1]) for r in cur.fetchall()}
            cur.close()
        finally:
            conn.close()

        clients = []
        for phone_last10, name, auto_cashback in rows:
            if not phone_last10:
                continue
            clients.append({
                'phone_last10': phone_last10,
                'name': name,
                'auto_cashback': float(auto_cashback) if auto_cashback is not None else 0,
                'cashback_override': overrides.get(phone_last10),
            })

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'clients': clients})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    phone_last10 = normalize_phone(body.get('phone') or '')
    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}

    cashback_override = body.get('cashback_override')

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        if cashback_override is None:
            cur.execute(
                f"DELETE FROM {schema}.client_cashback_overrides WHERE phone_last10 = %s",
                (phone_last10,),
            )
        else:
            cur.execute(
                f"INSERT INTO {schema}.client_cashback_overrides (phone_last10, cashback_override, updated_at) "
                f"VALUES (%s, %s, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET cashback_override = EXCLUDED.cashback_override, updated_at = now()",
                (phone_last10, cashback_override),
            )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}
