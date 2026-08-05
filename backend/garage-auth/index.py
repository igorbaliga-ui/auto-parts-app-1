import json
import os
import re
import bcrypt
import psycopg2


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


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
                'Access-Control-Allow-Headers': 'Content-Type',
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
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

        if action == 'set_password':
            new_password = (body.get('password') or '').strip()
            old_password = body.get('old_password') or ''
            if len(new_password) < 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль — не менее 4 символов'})}
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
            # просим ввести имя, указанное в самой первой заявке с этим телефоном
            entered_name = (body.get('name') or '').strip().lower()
            if not entered_name:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите имя, указанное в заявке'})}
            cur.execute(
                f"SELECT name FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
                f"ORDER BY created_at ASC LIMIT 1",
                (phone_last10,),
            )
            name_row = cur.fetchone()
            actual_name = (name_row[0] or '').strip().lower() if name_row else ''
            if not actual_name or actual_name != entered_name:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Имя не совпадает с указанным в заявке'})}

            new_password = (body.get('password') or '').strip()
            if len(new_password) < 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль — не менее 4 символов'})}
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, password_hash, updated_at) "
                f"VALUES (%s, %s, now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now()",
                (phone_last10, new_hash),
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