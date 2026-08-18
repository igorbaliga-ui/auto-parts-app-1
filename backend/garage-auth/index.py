import json
import os
import re
import bcrypt
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit
from device_info import parse_device
from zvonok import start_flashcall, ZvonokError
from send_push import send_push_to_phone


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
    проверка наличия пароля, вход по телефону+паролю, установка/смена/удаление пароля.
    Восстановление забытого пароля (start_password_reset_call + reset_password) —
    через flash-call подтверждение номера, а не через VIN."""
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
                    f"SELECT login_type, user_agent, created_at, note, reverted, old_phone_last10 "
                    f"FROM {schema}.garage_login_history "
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
                'note': r['note'],
                'reverted': bool(r['reverted']),
                'can_revert': r['login_type'] == 'phone_changed' and not r['reverted'] and bool(r['old_phone_last10']),
            } for r in rows]
            # Откатить можно только САМУЮ ПОСЛЕДНЮЮ смену номера (rows уже отсортированы по
            # дате убывания) — более старые записи оставляем в истории без кнопки отката,
            # чтобы не откатывать «сквозь» более позднюю смену
            seen_revertable = False
            for h in history:
                if h['can_revert']:
                    if seen_revertable:
                        h['can_revert'] = False
                    else:
                        seen_revertable = True
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

        if action == 'apply_referral_code':
            # Клиент вводит промокод друга уже в «Гараже» (если не указал его в форме заявки).
            # Промокод можно применить только один раз — если уже привязан к кому-то, отклоняем.
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
            referral_code = re.sub(r'[^A-Z0-9]', '', (body.get('referral_code') or '').strip().upper())[:10]
            if not referral_code:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите промокод'})}
            cur.execute(
                f"SELECT referred_by_phone_last10 FROM {schema}.garage_accounts WHERE phone_last10 = %s",
                (phone_last10,),
            )
            existing_row = cur.fetchone()
            if existing_row and existing_row[0]:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Промокод уже был применён ранее'})}
            cur.execute(
                f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE referral_code = %s",
                (referral_code,),
            )
            ref_row = cur.fetchone()
            if not ref_row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Такого промокода не существует'})}
            if ref_row[0] == phone_last10:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нельзя применить свой же промокод'})}
            # referred_by_at фиксирует момент привязки промокода — в реферальный бонус
            # пригласившему пойдут только заказы друга, выполненные ПОСЛЕ этой даты,
            # старые (уже выполненные до применения промокода) заказы не учитываются
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, referred_by_phone_last10, referred_by_at, updated_at) "
                f"VALUES (%s, %s, now(), now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET "
                f"referred_by_phone_last10 = COALESCE(garage_accounts.referred_by_phone_last10, EXCLUDED.referred_by_phone_last10), "
                f"referred_by_at = COALESCE(garage_accounts.referred_by_at, EXCLUDED.referred_by_at), "
                f"updated_at = now()",
                (phone_last10, ref_row[0]),
            )
            cur.execute(
                f"SELECT name FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
                f"ORDER BY created_at ASC LIMIT 1",
                (ref_row[0],),
            )
            referrer_row = cur.fetchone()
            cur.execute(
                f"SELECT name FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
                f"ORDER BY created_at ASC LIMIT 1",
                (phone_last10,),
            )
            friend_row = cur.fetchone()
            friend_name = friend_row[0] if friend_row else 'Ваш друг'
            conn.commit()

            if referrer_row:
                send_push_to_phone(
                    dsn, schema, ref_row[0],
                    title='Новый приглашённый друг',
                    body=f'{friend_name} применил ваш промокод и стал вашим приглашённым другом. Бонус начислим за его будущие заказы.',
                )

            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'referred_by_name': referrer_row[0] if referrer_row else None})}

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

        if action == 'start_password_reset_call':
            # Восстановление забытого пароля звонком: заказываем flash-call точно так же,
            # как при первичном подтверждении номера, но НЕ пропускаем этот шаг для уже
            # подтверждённых номеров — при сбросе пароля звонок нужен каждый раз заново,
            # чтобы подтвердить, что паролем распоряжается именно владелец телефона.
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
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

        if action == 'reset_password':
            if is_blocked:
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}
            # Восстановление забытого пароля: подтверждение владения номером — по коду из
            # звонка (заказанного действием start_password_reset_call), а не по VIN — так
            # надёжнее, потому что VIN может быть известен не только владельцу телефона.
            entered_code = re.sub(r'\D', '', body.get('code') or '')
            if len(entered_code) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите 4 цифры из звонка'})}
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
            if entered_code != expected_suffix:
                cur.execute(
                    f"UPDATE {schema}.call_verifications SET attempts = attempts + 1 WHERE id = %s",
                    (v_id,),
                )
                conn.commit()
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный код'})}

            new_password = (body.get('password') or '').strip()
            if len(new_password) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль — ровно 4 символа'})}
            new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
            cur.execute(
                f"UPDATE {schema}.call_verifications SET status = 'verified', verified_at = now() WHERE id = %s",
                (v_id,),
            )
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts "
                f"(phone_last10, password_hash, phone_verified, phone_verified_at, updated_at) "
                f"VALUES (%s, %s, true, now(), now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET "
                f"password_hash = EXCLUDED.password_hash, phone_verified = true, "
                f"phone_verified_at = COALESCE(garage_accounts.phone_verified_at, EXCLUDED.phone_verified_at), "
                f"updated_at = now()",
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

        if action == 'admin_reset_phone_change_limit':
            # Ручное снятие 30-дневного ограничения на смену номера — для случаев,
            # когда клиенту срочно нужно сменить номер ещё раз, а менеджер убедился,
            # что это законный запрос. Действие доступно только из /admin.
            admin_password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
            if not admin_password_env or admin_password != admin_password_env:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль администратора'})}
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, phone_change_unlocked_at, updated_at) "
                f"VALUES (%s, now(), now()) "
                f"ON CONFLICT (phone_last10) DO UPDATE SET phone_change_unlocked_at = now(), updated_at = now()",
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

        if action == 'admin_revert_phone_change':
            # Отмена последней смены номера клиентом — доступна только менеджеру из /admin.
            # Здесь phone_last10 — ТЕКУЩИЙ (новый) номер клиента. Находим последнюю
            # непровёрнутую запись 'phone_changed' под этим номером и переносим все данные
            # (заявки, заметку, кэшбэк, push-подписки, рефералов, историю входов) обратно
            # на старый номер, которым она была помечена при смене.
            admin_password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
            if not admin_password_env or admin_password != admin_password_env:
                return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль администратора'})}

            cur.execute(
                f"SELECT id, old_phone_last10 FROM {schema}.garage_login_history "
                f"WHERE phone_last10 = %s AND login_type = 'phone_changed' AND reverted = false "
                f"ORDER BY created_at DESC LIMIT 1",
                (phone_last10,),
            )
            change_row = cur.fetchone()
            if not change_row:
                return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Смена номера для этого клиента не найдена'})}
            change_id, old_phone_last10 = change_row
            if not old_phone_last10:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Для этой смены номера нет данных для отката (старая запись)'})}

            # Старый номер должен быть свободен — если клиент (или кто-то другой) уже
            # успел зарегистрироваться на нём заново, автоматический откат невозможен
            cur.execute(
                f"SELECT 1 FROM {schema}.leads WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s LIMIT 1",
                (old_phone_last10,),
            )
            old_phone_taken = cur.fetchone() is not None
            if not old_phone_taken:
                cur.execute(
                    f"SELECT 1 FROM {schema}.garage_accounts WHERE phone_last10 = %s LIMIT 1",
                    (old_phone_last10,),
                )
                old_phone_taken = cur.fetchone() is not None
            if old_phone_taken:
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Старый номер уже занят — откат невозможен'})}

            new_phone_e164 = '+7' + phone_last10
            old_phone_e164 = '+7' + old_phone_last10

            cur.execute(
                f"UPDATE {schema}.leads SET phone = %s "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s",
                (old_phone_e164, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_notes SET phone_last10 = %s WHERE phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_cashback_deductions SET phone_last10 = %s WHERE phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_cashback_overrides SET phone_last10 = %s WHERE phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.push_subscriptions SET phone_last10 = %s WHERE phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.garage_login_history SET phone_last10 = %s "
                f"WHERE phone_last10 = %s AND id != %s",
                (old_phone_last10, phone_last10, change_id),
            )
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET referred_by_phone_last10 = %s WHERE referred_by_phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET phone_last10 = %s, updated_at = now() WHERE phone_last10 = %s",
                (old_phone_last10, phone_last10),
            )
            # Помечаем саму запись о смене как отменённую и переносим её тоже — чтобы
            # в истории старого номера остался явный след отмены, а повторно её
            # нельзя было откатить ещё раз
            cur.execute(
                f"UPDATE {schema}.garage_login_history SET reverted = true, phone_last10 = %s WHERE id = %s",
                (old_phone_last10, change_id),
            )
            cur.execute(
                f"INSERT INTO {schema}.garage_login_history (phone_last10, login_type, user_agent, ip, note) "
                f"VALUES (%s, 'phone_change_reverted', '', %s, %s)",
                (old_phone_last10, client_ip, f'Менеджер отменил смену номера: {new_phone_e164} → {old_phone_e164}'),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'old_phone': old_phone_e164})}

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

        # Смена номера телефона в личном кабинете «Гараж»: здесь phone_last10 — СТАРЫЙ
        # (текущий) номер клиента, уже прошедшего вход. Новый номер передаётся отдельным
        # полем new_phone и должен быть подтверждён отдельным звонком, прежде чем все
        # данные клиента (заявки, заметка, кэшбэк, история входов, push-подписки,
        # рефералы) будут перенесены на него.
        if action in ('start_phone_change_call', 'verify_phone_change'):
            new_phone_last10 = normalize_phone(body.get('new_phone') or '')
            if len(new_phone_last10) < 10:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный новый телефон'})}
            if new_phone_last10 == phone_last10:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Новый номер совпадает с текущим'})}

            # Защита от злоупотреблений: не чаще одного раза в 30 дней. Каждая смена
            # переносит запись 'phone_changed' вместе со всей историей на новый номер,
            # поэтому последняя такая запись под ТЕКУЩИМ номером и есть дата последней смены.
            # Менеджер может вручную снять это ограничение из /admin (phone_change_unlocked_at) —
            # тогда лимит не действует, пока не пройдёт очередная смена номера
            cur.execute(
                f"SELECT phone_change_unlocked_at FROM {schema}.garage_accounts WHERE phone_last10 = %s",
                (phone_last10,),
            )
            unlock_row = cur.fetchone()
            phone_change_unlocked_at = unlock_row[0] if unlock_row else None

            cur.execute(
                f"SELECT created_at FROM {schema}.garage_login_history "
                f"WHERE phone_last10 = %s AND login_type = 'phone_changed' "
                f"ORDER BY created_at DESC LIMIT 1",
                (phone_last10,),
            )
            last_change_row = cur.fetchone()
            unlocked_after_last_change = bool(
                phone_change_unlocked_at and (not last_change_row or phone_change_unlocked_at > last_change_row[0])
            )
            if last_change_row and not unlocked_after_last_change:
                cur.execute("SELECT now() - %s < INTERVAL '30 days', %s + INTERVAL '30 days'", (last_change_row[0], last_change_row[0]))
                too_soon, next_allowed = cur.fetchone()
                if too_soon:
                    return {
                        'statusCode': 429,
                        'headers': headers,
                        'body': json.dumps({
                            'error': f'Номер телефона можно менять не чаще раза в 30 дней. Следующая смена будет доступна {next_allowed.strftime("%d.%m.%Y")}',
                        }),
                    }

            # Новый номер не должен быть уже занят другим клиентом — иначе перенос
            # данных перезаписал бы чужую историю заказов
            cur.execute(
                f"SELECT 1 FROM {schema}.leads WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s LIMIT 1",
                (new_phone_last10,),
            )
            phone_taken = cur.fetchone() is not None
            if not phone_taken:
                cur.execute(
                    f"SELECT 1 FROM {schema}.garage_accounts WHERE phone_last10 = %s LIMIT 1",
                    (new_phone_last10,),
                )
                phone_taken = cur.fetchone() is not None
            if phone_taken:
                return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Этот номер уже привязан к другому аккаунту'})}

            if action == 'start_phone_change_call':
                cur.execute(
                    f"SELECT created_at FROM {schema}.call_verifications "
                    f"WHERE phone_last10 = %s ORDER BY created_at DESC LIMIT 1",
                    (new_phone_last10,),
                )
                last_row = cur.fetchone()
                if last_row:
                    cur.execute("SELECT now() - %s < INTERVAL '60 seconds'", (last_row[0],))
                    too_soon = cur.fetchone()[0]
                    if too_soon:
                        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Повторный звонок можно заказать через минуту'})}
                phone_e164 = '+7' + new_phone_last10
                try:
                    call = start_flashcall(phone_e164)
                except ZvonokError as exc:
                    return {'statusCode': 502, 'headers': headers, 'body': json.dumps({'error': str(exc)})}
                cur.execute(
                    f"INSERT INTO {schema}.call_verifications (phone_last10, call_id, expected_suffix) "
                    f"VALUES (%s, %s, %s)",
                    (new_phone_last10, call['call_id'], call['pincode']),
                )
                conn.commit()
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

            # action == 'verify_phone_change'
            entered = re.sub(r'\D', '', body.get('code') or '')
            if len(entered) != 4:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите 4 цифры'})}
            cur.execute(
                f"SELECT id, expected_suffix, attempts FROM {schema}.call_verifications "
                f"WHERE phone_last10 = %s AND status = 'pending' "
                f"ORDER BY created_at DESC LIMIT 1",
                (new_phone_last10,),
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

            new_phone_e164 = '+7' + new_phone_last10
            old_phone_e164 = '+7' + phone_last10

            # Переносим все данные клиента со старого номера на новый одной транзакцией
            cur.execute(
                f"UPDATE {schema}.leads SET phone = %s "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s",
                (new_phone_e164, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_notes SET phone_last10 = %s WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_cashback_deductions SET phone_last10 = %s WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.client_cashback_overrides SET phone_last10 = %s WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.push_subscriptions SET phone_last10 = %s WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.garage_login_history SET phone_last10 = %s WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            # Друзья, приглашённые этим клиентом — реферальная ссылка должна и дальше
            # указывать на него, уже под новым номером
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET referred_by_phone_last10 = %s WHERE referred_by_phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET phone_last10 = %s, updated_at = now() WHERE phone_last10 = %s",
                (new_phone_last10, phone_last10),
            )
            # Оставляем менеджеру заметный след смены номера в истории входов —
            # под обоими номерами, чтобы найти клиента можно было по любому из них.
            # old_phone_last10 хранится отдельным полем (не только в тексте note), чтобы
            # менеджер мог одной кнопкой отменить именно эту смену и вернуть всё как было
            user_agent = req_headers.get('User-Agent') or req_headers.get('user-agent') or ''
            cur.execute(
                f"INSERT INTO {schema}.garage_login_history (phone_last10, login_type, user_agent, ip, note, old_phone_last10) "
                f"VALUES (%s, 'phone_changed', %s, %s, %s, %s)",
                (new_phone_last10, user_agent, client_ip, f'Сменил номер: {old_phone_e164} → {new_phone_e164}', phone_last10),
            )
            conn.commit()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'new_phone': new_phone_e164})}

        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректное действие'})}
    finally:
        cur.close()
        conn.close()