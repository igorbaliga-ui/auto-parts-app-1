import json
import os
import random
import re
import string
import psycopg2
import psycopg2.errors
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit

# Без легко путаемых символов (0/O, 1/I)
REFERRAL_CODE_ALPHABET = ''.join(c for c in string.ascii_uppercase + string.digits if c not in '01OI')


def get_or_create_referral_code(conn, schema: str, phone_last10: str) -> str:
    """Возвращает персональный код приглашения клиента, создавая его при первом обращении."""
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT referral_code FROM {schema}.garage_accounts WHERE phone_last10 = %s", (phone_last10,))
        row = cur.fetchone()
        if row and row[0]:
            return row[0]

        for _ in range(8):
            code = ''.join(random.choices(REFERRAL_CODE_ALPHABET, k=6))
            try:
                cur.execute(
                    f"INSERT INTO {schema}.garage_accounts (phone_last10, referral_code, updated_at) "
                    f"VALUES (%s, %s, now()) "
                    f"ON CONFLICT (phone_last10) DO UPDATE SET referral_code = EXCLUDED.referral_code, updated_at = now() "
                    f"WHERE garage_accounts.referral_code IS NULL",
                    (phone_last10, code),
                )
                conn.commit()
                break
            except psycopg2.errors.UniqueViolation:
                conn.rollback()
                continue

        cur.execute(f"SELECT referral_code FROM {schema}.garage_accounts WHERE phone_last10 = %s", (phone_last10,))
        row = cur.fetchone()
        return row[0] if row else None
    finally:
        cur.close()


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

    # Проверка промокода друга прямо в форме заявки, без ожидания ответа на всю заявку —
    # не привязана к телефону, поэтому обрабатывается раньше валидации телефона
    if params.get('check_promo') is not None:
        promo_code = re.sub(r'[^A-Z0-9]', '', (params.get('check_promo') or '').strip().upper())[:10]
        if not promo_code:
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'valid': False})}
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT 1 FROM {schema}.garage_accounts WHERE referral_code = %s",
                (promo_code,),
            )
            valid = cur.fetchone() is not None
            cur.close()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'valid': valid})}

    phone = (params.get('phone') or '').strip()
    phone_digits = re.sub(r'\D', '', phone)

    if len(phone_digits) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}

    # Сравниваем по последним 10 цифрам, чтобы +7900..., 8900... и 900... считались одним номером
    phone_last10 = phone_digits[-10:]

    # Облегчённый режим для формы заявки неавторизованного посетителя: только факт наличия
    # номера в базе, без имени и других данных — чтобы не раскрывать чужие персональные данные
    if params.get('exists_only') == '1':
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT 1 FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s LIMIT 1",
                (phone_last10,),
            )
            exists = cur.fetchone() is not None
            cur.close()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'exists': exists})}

    # Промокод друга можно указать только один раз: проверяем, не привязан ли к этому
    # номеру уже чей-то реферальный код — чтобы форма заявки могла скрыть поле промокода
    if params.get('promo_used') == '1':
        conn = psycopg2.connect(dsn)
        try:
            cur = conn.cursor()
            cur.execute(
                f"SELECT referred_by_phone_last10 FROM {schema}.garage_accounts WHERE phone_last10 = %s",
                (phone_last10,),
            )
            row = cur.fetchone()
            used = bool(row and row[0])
            cur.close()
        finally:
            conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'used': used})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Клиент, заблокированный менеджером, не должен видеть заказы, даже если у него
        # не задан пароль (в этом случае форма входа не запрашивает пароль вовсе)
        cur.execute(
            f"SELECT is_blocked FROM {schema}.garage_accounts WHERE phone_last10 = %s",
            (phone_last10,),
        )
        account_row = cur.fetchone()
        if account_row and account_row['is_blocked']:
            cur.close()
            return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Доступ в «Гараж» временно заблокирован. Обратитесь к менеджеру'})}

        # Автоархивация: заявки в статусе «Новая», которые за 14 дней так и не взяли в работу
        cur.execute(
            f"UPDATE {schema}.leads SET archived = true, archived_at = now() "
            f"WHERE status = 'new' AND archived = false AND created_at < now() - INTERVAL '14 days'"
        )
        conn.commit()

        cur.execute(
            f"SELECT id, vin, name, phone, parts, messenger, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived, archived, in_progress_at, arrived_at, mileage "
            f"FROM {schema}.leads WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
            f"ORDER BY created_at DESC LIMIT 100",
            (phone_last10,),
        )
        rows = cur.fetchall()

        # Ручные операции менеджера с бонусами (списания и начисления) — меняют общую сумму, видную клиенту
        cur.execute(
            f"SELECT id, amount, type, created_at FROM {schema}.client_cashback_deductions "
            f"WHERE phone_last10 = %s ORDER BY created_at DESC",
            (phone_last10,),
        )
        deduction_rows = cur.fetchall()
        cashback_deducted = sum(
            float(d['amount']) if d['type'] == 'deduct' else -float(d['amount'])
            for d in deduction_rows
        )

        # Друзья, приглашённые этим клиентом по его реферальному коду — начисляем 2% от
        # суммы каждого их выполненного заказа, дополнительно к обычному кэшбеку 3%
        cur.execute(
            f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE referred_by_phone_last10 = %s",
            (phone_last10,),
        )
        friend_phones = [r['phone_last10'] for r in cur.fetchall()]

        referral_bonus_total = 0.0
        referrals = []
        if friend_phones:
            cur.execute(
                f"SELECT RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_last10, "
                f"MAX(name) AS name, "
                f"SUM(CASE WHEN status = 'done' THEN order_amount ELSE 0 END) AS done_amount, "
                f"COUNT(*) FILTER (WHERE status = 'done') AS done_count "
                f"FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = ANY(%s) "
                f"GROUP BY 1",
                (friend_phones,),
            )
            for r in cur.fetchall():
                done_amount = float(r['done_amount']) if r['done_amount'] is not None else 0.0
                friend_bonus = round(done_amount * 0.02, 2)
                referral_bonus_total += friend_bonus
                referrals.append({
                    'name': r['name'],
                    'done_orders': int(r['done_count'] or 0),
                    'bonus_earned': friend_bonus,
                })

        referral_code = get_or_create_referral_code(conn, schema, phone_last10)

        # Если этот клиент сам когда-то ввёл чужой промокод — покажем в «Гараже», от кого он
        cur.execute(
            f"SELECT referred_by_phone_last10 FROM {schema}.garage_accounts WHERE phone_last10 = %s",
            (phone_last10,),
        )
        acc_row = cur.fetchone()
        referred_by_phone = acc_row['referred_by_phone_last10'] if acc_row else None
        referred_by_name = None
        if referred_by_phone:
            cur.execute(
                f"SELECT name FROM {schema}.leads "
                f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
                f"ORDER BY created_at ASC LIMIT 1",
                (referred_by_phone,),
            )
            referrer_row = cur.fetchone()
            referred_by_name = referrer_row['name'] if referrer_row else None
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
            'mileage': r['mileage'],
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
            'type': 'accrual' if d['type'] == 'accrue' else 'deduction',
            'amount': float(d['amount']),
            'label': 'Начисление бонусов' if d['type'] == 'accrue' else 'Списание',
            'created_at': d['created_at'].isoformat() if d['created_at'] else None,
        })
    for ref in referrals:
        if ref['bonus_earned'] > 0:
            cashback_history.append({
                'type': 'accrual',
                'amount': ref['bonus_earned'],
                'label': f"Бонус за друга {ref['name'] or ''}".strip(),
                'created_at': None,
            })
    cashback_history.sort(key=lambda h: h['created_at'] or '', reverse=True)

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({
            'orders': orders,
            'cashback_deducted': cashback_deducted,
            'cashback_history': cashback_history,
            'referral_code': referral_code,
            'referral_bonus_total': referral_bonus_total,
            'referrals': referrals,
            'referred_by_name': referred_by_name,
        }),
    }