import json
import os
import re
import bcrypt
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit
from device_info import parse_device
from zvonok import start_flashcall, ZvonokError


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
    req_headers = event.get('headers') or {}
    admin_password_env = os.environ.get('ADMIN_PASSWORD')

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone_last10 = normalize_phone(params.get('phone') or '')
        if len(phone_last10) < 10:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

        if params.get('history') == '1':
            # История входов в личный кабинет: дата, устройство, обычный вход или восстановление
            # пароля — содержит IP и User-Agent клиента, поэтому доступна только менеджеру из /admin
            admin_password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
            if not admin_password_env or admin_password != admin_password_env:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль администратора'})}
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
                f"SELECT password_hash, is_blocked, phone_verified FROM {schema}.garage_accounts WHERE phone_last10 = %s",
                (phone_last10,),
            )
            row = cur.fetchone()
            cur.close()
        finally:
            conn.close()

        has_password = bool(row and row[0])
        is_blocked = bool(row and row[1])
        phone_verified = bool(row and row[2])
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'has_password': has_password, 'is_blocked': is_blocked, 'phone_verified': phone_verified})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    # Защита от подбора пароля: не более 20 попыток входа/смены пароля с одного IP за 10 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'garage-auth', max_requests=20, window_seconds=600):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много попыток. Попробуйте позже'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')
    phone_last10 = normalize_phone(body.get('phone') or '')

    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT password_hash, is_blocked, phone_verified FROM {schema}.garage_accounts WHERE phone_last10 = %s",
            (phone_last10,),
        )
        row = cur.fetchone()
        current_hash = row[0] if row else None
        is_blocked = bool(row[1]) if row else False
        phone_verified = bool(row[2]) if row else False

        if action == 'login':
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
            if not phone_verified:
                return {'statusCode': 428, 'headers': headers, 'body': json.dumps({'error': 'Требуется подтверждение номера звонком', 'phone_verified': False})}
            password = body.get('password') or ''
            if current_hash:
                if not password or not bcrypt.checkpw(password.encode(), current_hash.encode()):
                    return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}
            user_agent = req_headers.get('User-Agent') or req_headers.get('user-agent') or ''
            log_login(cur, schema, phone_last10, 'login', user_agent, client_ip)
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'start_call_verification':
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
            if phone_verified:
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'already_verified': True})}
            # Не даём заказывать новый звонок чаще раза в минуту на один номер
            cur.execute(
                f"SELECT created_at FROM {schema}.call_verifications "
                f"WHERE phone_last10 = %s ORDER BY created_at DESC LIMIT 1",
                (phone_last10,),
            )
            last_row = cur.fetchone()
            if last_row:
                cur.execute("SELECT now() - %s < INTERVAL '60 seconds'", (last_row[0],))
                too_soon = cur.fetchone()[0]
                if too_soon:
                    return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Повторный звонок можно заказать через минуту'})}
            phone_e164 = '+7' + phone_last10
            try:
                call = start_flashcall(phone_e164)
            except ZvonokError as exc:
                return {'statusCode': 502, 'headers': headers, 'body': json.dumps({'error': str(exc)})}
            cur.execute(
                f"INSERT INTO {schema}.call_verifications (phone_last10, call_id, expected_suffix) "
                f"VALUES (%s, %s, %s)",
                (phone_last10, call['call_id'], call['pincode']),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'verify_call':
            entered = re.sub(r'\D', '', body.get('code') or '')
            if len(entered) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите 4 цифры'})}
            cur.execute(
                f"SELECT id, expected_suffix, attempts FROM {schema}.call_verifications "
                f"WHERE phone_last10 = %s AND status = 'pending' "
                f"ORDER BY created_at DESC LIMIT 1",
                (phone_last10,),
            )
            v_row = cur.fetchone()
            if not v_row:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Сначала закажите звонок'})}
            v_id, expected_suffix, attempts = v_row
            if attempts >= 5:
                return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много попыток. Закажите новый звонок'})}
            if entered != expected_suffix:
                cur.execute(
                    f"UPDATE {schema}.call_verifications SET attempts = attempts + 1 WHERE id = %s",
                    (v_id,),
                )
                conn.commit()
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный код'})}
            cur.execute(
                f"UPDATE {schema}.call_verifications SET status = 'verified', verified_at = now() WHERE id = %s",
                (v_id,),
            )
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, phone_verified, phone_verified_at, updated_at) "
                f"VALUES (%s, true, now(), now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET phone_verified = true, phone_verified_at = now(), updated_at = now()",
                (phone_last10,),
            )
            user_agent = req_headers.get('User-Agent') or req_headers.get('user-agent') or ''
            log_login(cur, schema, phone_last10, 'call_verified', user_agent, client_ip)
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
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
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

        if action == 'admin_toggle_block':
            # Временная блокировка/разблокировка доступа клиента в «Гараж» менеджером из /admin —
            # заблокированный клиент не может войти по телефону, даже без пароля
            admin_password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
            if not admin_password_env or admin_password != admin_password_env:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль администратора'})}
            new_blocked = bool(body.get('blocked'))
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, is_blocked, blocked_at, updated_at) "
                f"VALUES (%s, %s, {'now()' if new_blocked else 'NULL'}, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET is_blocked = EXCLUDED.is_blocked, "
                f"blocked_at = {'now()' if new_blocked else 'NULL'}, updated_at = now()",
                (phone_last10, new_blocked),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'is_blocked': new_blocked})}

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