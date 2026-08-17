import json
import os
import re

import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit
from send_push import send_push_to_phone


def normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def handler(event: dict, context) -> dict:
    """Считает суммарный кэшбэк клиента (индивидуальный % от выполненных заказов, плюс
    ручные начисления, минус списания) и позволяет менеджеру вручную списать или начислить
    кэшбэк по номеру телефона, а также задать индивидуальный процент бонуса за покупки и
    процент реферального бонуса за приглашённых друзей (action=set_percent) (для /admin).
    Для каждого клиента также отдаёт referral_details — список приглашённых им друзей
    (телефон, имя, заметка менеджера, начисленный с него бонус) для вкладки «Рефералы».
    Также управляет разовым бонусом за регистрацию — общей суммой для всех новых клиентов
    (GET ?settings=1 — прочитать, action=set_signup_bonus — изменить).
    Автоматические начисления (выполненные заказы) продолжают суммироваться в общий кэшбэк.
    Клиент в «Гараже» видит итоговую сумму."""
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

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'client-cashback', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    if method == 'GET':
        params = event.get('queryStringParameters') or {}
        phone_param = params.get('phone')

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

            if params.get('settings') == '1':
                # Разовый бонус за регистрацию — общая сумма для всех новых клиентов
                cur.execute(f"SELECT signup_bonus_amount FROM {schema}.app_settings WHERE id = 1")
                settings_row = cur.fetchone()
                cur.close()
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({
                        'signup_bonus_amount': float(settings_row['signup_bonus_amount']) if settings_row else 0,
                    }),
                }

            if phone_param:
                # История списаний/начислений по конкретному клиенту
                phone_last10 = normalize_phone(phone_param)
                cur.execute(
                    f"SELECT id, amount, type, admin_name, created_at FROM {schema}.client_cashback_deductions "
                    f"WHERE phone_last10 = %s ORDER BY created_at DESC LIMIT 200",
                    (phone_last10,),
                )
                rows = cur.fetchall()
                cur.close()
                history = [{
                    'id': r['id'],
                    'amount': float(r['amount']),
                    'type': r['type'],
                    'admin_name': r['admin_name'],
                    'created_at': r['created_at'].isoformat() if r['created_at'] else None,
                } for r in rows]
                return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'history': history})}

            # Список всех клиентов со сводкой по кэшбэку
            cur.execute(
                f"SELECT RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_last10, "
                f"MAX(name) AS name, MAX(phone) AS phone, "
                f"SUM(CASE WHEN status = 'done' THEN cashback ELSE 0 END) AS accrued "
                f"FROM {schema}.leads GROUP BY 1"
            )
            rows = cur.fetchall()
            name_map = {r['phone_last10']: r['name'] for r in rows}
            phone_map = {r['phone_last10']: r['phone'] for r in rows}

            # Заметки менеджера по клиенту (для отображения рядом с приглашённым другом в рефералах)
            cur.execute(f"SELECT phone_last10, note FROM {schema}.client_notes")
            notes_map = {r['phone_last10']: r['note'] for r in cur.fetchall()}

            cur.execute(
                f"SELECT phone_last10, "
                f"COALESCE(SUM(amount) FILTER (WHERE type = 'deduct'), 0) AS deducted, "
                f"COALESCE(SUM(amount) FILTER (WHERE type = 'accrue'), 0) AS manual_accrued "
                f"FROM {schema}.client_cashback_deductions GROUP BY 1"
            )
            adjust_map = {
                r['phone_last10']: (float(r['deducted']), float(r['manual_accrued']))
                for r in cur.fetchall()
            }

            # Индивидуальные проценты кэшбэка и реферального бонуса, заданные менеджером
            # для каждого клиента (по умолчанию 3% и 2% соответственно)
            cur.execute(
                f"SELECT phone_last10, cashback_percent, referral_percent FROM {schema}.garage_accounts"
            )
            percent_map = {
                r['phone_last10']: (float(r['cashback_percent']), float(r['referral_percent']))
                for r in cur.fetchall()
            }

            # Реферальный бонус по каждому приглашённому другу отдельно (кто именно пригласил,
            # сколько друг заработал пригласившему) — считается по ИНДИВИДУАЛЬНОМУ проценту
            # самого пригласившего. Из этих же строк дальше собираем и сумму, и число друзей.
            cur.execute(
                f"SELECT ga.referred_by_phone_last10 AS inviter, ga.phone_last10 AS friend_phone, "
                f"ga.referred_by_at, "
                f"COALESCE(SUM(CASE WHEN l.status = 'done' THEN l.order_amount ELSE 0 END), 0) AS friend_done_amount "
                f"FROM {schema}.garage_accounts ga "
                f"LEFT JOIN {schema}.leads l ON RIGHT(regexp_replace(l.phone, '\\D', '', 'g'), 10) = ga.phone_last10 "
                f"WHERE ga.referred_by_phone_last10 IS NOT NULL "
                f"GROUP BY 1, 2, 3"
            )
            friend_rows = cur.fetchall()
            cur.close()

            referral_map: dict = {}
            friends_count_map: dict = {}
            referral_details_map: dict = {}
            for r in friend_rows:
                inviter = r['inviter']
                friend_phone = r['friend_phone']
                _, referral_percent = percent_map.get(inviter, (3.0, 2.0))
                friend_bonus = round(float(r['friend_done_amount'] or 0) * referral_percent / 100, 2)
                referral_map[inviter] = referral_map.get(inviter, 0) + friend_bonus
                friends_count_map[inviter] = friends_count_map.get(inviter, 0) + 1
                referral_details_map.setdefault(inviter, []).append({
                    'phone_last10': friend_phone,
                    'name': name_map.get(friend_phone),
                    'phone': phone_map.get(friend_phone),
                    'note': notes_map.get(friend_phone),
                    'bonus_earned': friend_bonus,
                    'referred_at': r['referred_by_at'].isoformat() if r['referred_by_at'] else None,
                })
            for details in referral_details_map.values():
                details.sort(key=lambda d: d['referred_at'] or '', reverse=True)
        finally:
            conn.close()

        clients = []
        for r in rows:
            phone_last10 = r['phone_last10']
            if not phone_last10:
                continue
            accrued = float(r['accrued']) if r['accrued'] is not None else 0
            deducted, manual_accrued = adjust_map.get(phone_last10, (0, 0))
            referral_bonus = referral_map.get(phone_last10, 0)
            cashback_percent, referral_percent = percent_map.get(phone_last10, (3.0, 2.0))
            clients.append({
                'phone_last10': phone_last10,
                'name': r['name'],
                'accrued': accrued,
                'deducted': deducted,
                'manual_accrued': manual_accrued,
                'referral_bonus': referral_bonus,
                'friends_invited_count': friends_count_map.get(phone_last10, 0),
                'total_cashback': accrued + manual_accrued + referral_bonus - deducted,
                'cashback_percent': cashback_percent,
                'referral_percent': referral_percent,
                'referral_details': referral_details_map.get(phone_last10, []),
            })

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'clients': clients})}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    action = body.get('action')

    if action == 'set_signup_bonus':
        # Меняет разовый бонус за регистрацию, который начисляется всем новым клиентам
        # при первой заявке (см. backend/leads-submit)
        try:
            signup_bonus_amount = float(body.get('signup_bonus_amount'))
        except (TypeError, ValueError):
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректная сумма бонуса'})}
        if signup_bonus_amount < 0:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Сумма не может быть отрицательной'})}

        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE {schema}.app_settings SET signup_bonus_amount = %s, updated_at = now() WHERE id = 1",
                (signup_bonus_amount,),
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    if action == 'set_percent':
        # Индивидуальная настройка процента кэшбэка и/или реферального бонуса клиента
        phone_last10 = normalize_phone(body.get('phone') or '')
        if len(phone_last10) < 10:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}

        set_clauses = []
        params = []
        if 'cashback_percent' in body:
            try:
                cashback_percent = float(body['cashback_percent'])
            except (TypeError, ValueError):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный процент бонуса за покупки'})}
            if cashback_percent < 0 or cashback_percent > 100:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Процент должен быть от 0 до 100'})}
            set_clauses.append('cashback_percent = %s')
            params.append(cashback_percent)
        if 'referral_percent' in body:
            try:
                referral_percent = float(body['referral_percent'])
            except (TypeError, ValueError):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный процент бонуса за друга'})}
            if referral_percent < 0 or referral_percent > 100:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Процент должен быть от 0 до 100'})}
            set_clauses.append('referral_percent = %s')
            params.append(referral_percent)

        if not set_clauses:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нечего сохранять'})}

        params.append(phone_last10)
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"INSERT INTO {schema}.garage_accounts (phone_last10, updated_at) VALUES (%s, now()) "
                f"ON CONFLICT (phone_last10) DO NOTHING",
                (phone_last10,),
            )
            cur.execute(
                f"UPDATE {schema}.garage_accounts SET {', '.join(set_clauses)}, updated_at = now() WHERE phone_last10 = %s",
                params,
            )
            conn.commit()
            cur.close()
        finally:
            conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}

    phone_last10 = normalize_phone(body.get('phone') or '')
    if len(phone_last10) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}

    amount = body.get('amount')
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректная сумма'})}

    if amount <= 0:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Сумма должна быть больше нуля'})}

    op_type = body.get('type') or 'deduct'
    if op_type not in ('deduct', 'accrue'):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный тип операции'})}

    admin_name = (body.get('admin_name') or '').strip() or 'Менеджер'

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {schema}.client_cashback_deductions (phone_last10, amount, type, admin_name) "
            f"VALUES (%s, %s, %s, %s)",
            (phone_last10, amount, op_type, admin_name),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    amount_str = f'{amount:,.0f}'.replace(',', ' ')
    if op_type == 'accrue':
        send_push_to_phone(
            dsn, schema, phone_last10,
            title='Начислены бонусы',
            body=f'Вам начислено {amount_str} бонусов. Проверьте баланс в «Гараже».',
        )
    else:
        send_push_to_phone(
            dsn, schema, phone_last10,
            title='Списаны бонусы',
            body=f'С вашего баланса списано {amount_str} бонусов.',
        )

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}