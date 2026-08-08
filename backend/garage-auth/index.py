import json
import os
import re
import bcrypt
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit
from device_info import parse_device


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def log_login(cur, schema: str, phone_last10: str, login_type: str, user_agent: str, ip: str) -> None:
    """Записывает факт входа/восстановления пароля в журнал истории входов."""
    cur.execute(
        f"INSERT INTO {schema}.garage_login_history (phone_last10, login_type, user_agent, ip) "
        f"VALUES (%s, %s, %s, %s)",
        (phone_last10, login_type, user_agent or '', ip or ''),
    )


def handler(event: dict, context) -> dict:
    """Управляет опциональным паролем для входа в личный кабинет «Гараж»:
    проверка наличия пароля, вход по телефону+паролю, установка/смена/удаление пароля"""
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

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone_last10 = normalize_phone(params.get('phone') or '')
        if len(phone_last10) < 10:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

        if params.get('history') == '1':
            # История входов в личный кабинет: дата, устройство, обычный вход или восстановление пароля
            conn = psycopg2.connect(dsn)
            try:
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute(
                    f"SELECT login_type, user_agent, created_at FROM {schema}.garage_login_history "
                    f"WHERE phone_last10 = %s ORDER BY created_at DESC LIMIT 50",
                    (phone_last10,),
                )
                rows = cur.fetchall()
                cur.close()
            finally:
                conn.close()

            history = [{
                'login_type': r['login_type'],
                'device': parse_device(r['user_agent']),
                'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            } for r in rows]
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'history': history})}

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT password_hash FROM {schema}.garage_accounts WHERE phone_last10 = %s",
                (phone_last10,),
            )
            row = cur.fetchone()
            cur.close()
        finally:
            conn.close()

        has_password = bool(row and row[0])
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'has_password': has_password})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    # Защита от подбора пароля: не более 20 попыток входа/смены пароля с одного IP за 10 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'garage-auth', max_requests=20, window_seconds=600):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много попыток. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    admin_password_env = os.environ.get('ADMIN_PASSWORD')

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    phone_last10 = normalize_phone(body.get('phone') or '')

    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT password_hash FROM {schema}.garage_accounts WHERE phone_last10 = %s",
            (phone_last10,),
        )
        row = cur.fetchone()
        current_hash = row[0] if row else None

        if action == 'login':
            password = body.get('password') or ''
            if current_hash:
                if not password or not bcrypt.checkpw(password.encode(), current_hash.encode()):
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}
            user_agent = req_headers.get('User-Agent') or req_headers.get('user-agent') or ''
            log_login(cur, schema, phone_last10, 'login', user_agent, client_ip)
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'set_password':
            new_password = (body.get('password') or '').strip()
            old_password = body.get('old_password') or ''
            if len(new_password) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль — ровно 4 символа'})}
            if current_hash:
                if not old_password or not bcrypt.checkpw(old_password.encode(), current_hash.encode()):
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный текущий пароль'})}
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, password_hash, updated_at) "
                f"VALUES (%s, %s, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()",
                (phone_last10, new_hash),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'reset_password':
            # Восстановление забытого пароля: для подтверждения, что это владелец номера,
            # просим ввести VIN любого автомобиля из истории заявок с этим телефоном
            entered_vin = (body.get('vin') or '').strip().upper()
            if not entered_vin:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите VIN автомобиля из заявки'})}
            cur.execute(
                f"SELECT 1 FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s AND vin = %s "
                f"LIMIT 1",
                (phone_last10, entered_vin),
            )
            vin_row = cur.fetchone()
            if not vin_row:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'VIN не совпадает ни с одной заявкой этого номера'})}

            new_password = (body.get('password') or '').strip()
            if len(new_password) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль — ровно 4 символа'})}
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, password_hash, updated_at) "
                f"VALUES (%s, %s, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()",
                (phone_last10, new_hash),
            )
            user_agent = req_headers.get('User-Agent') or req_headers.get('user-agent') or ''
            log_login(cur, schema, phone_last10, 'reset_password', user_agent, client_ip)
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'admin_reset_password':
            # Принудительный сброс пароля клиента менеджером из /admin —
            # для случаев, когда клиент забыл и пароль, и имя из первой заявки
            admin_password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
            if not admin_password_env or admin_password != admin_password_env:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль администратора'})}
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET password_hash = NULL, updated_at = now() WHERE phone_last10 = %s",
                (phone_last10,),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'remove_password':
            old_password = body.get('old_password') or ''
            if current_hash:
                if not old_password or not bcrypt.checkpw(old_password.encode(), current_hash.encode()):
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный текущий пароль'})}
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET password_hash = NULL, updated_at = now() WHERE phone_last10 = %s",
                (phone_last10,),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректное действие'})}
    finally:
        cur.close()
        conn.close()