import json
import os
import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Отдаёт список заявок с сайта по паролю (для страницы /admin).
    Перед выдачей автоматически переносит в архив заявки со статусом «Новая» (new),
    которые провисели без действий менеджера дольше 14 дней."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'GET':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'leads-admin', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

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
            f"SELECT id, vin, name, phone, parts, messenger, photo_url, photo_urls, order_amount, prepayment, remaining, cashback, created_at, car_name, city, status, completed_at, arrived, internal_note, archived, mileage, handled_by "
            f"FROM {schema}.leads ORDER BY created_at DESC LIMIT 500"
        )
        rows = cur.fetchall()

        # Номера, заблокированные в «Гараже» — чтобы отметить их в таблице заявок без
        # отдельного запроса на каждую строку
        cur.execute(f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE is_blocked = true")
        blocked_phones = {r['phone_last10'] for r in cur.fetchall()}

        # Номера, подтверждённые звонком в «Гараже»
        cur.execute(f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE phone_verified = true")
        verified_phones = {r['phone_last10'] for r in cur.fetchall()}

        # Кто кого пригласил (реферальная программа) — сопоставляем номер клиента с номером
        # пригласившего, а затем с его именем и телефоном для отображения в /admin
        cur.execute(
            f"SELECT phone_last10, referred_by_phone_last10 FROM {schema}.garage_accounts "
            f"WHERE referred_by_phone_last10 IS NOT NULL"
        )
        referred_by_map = {r['phone_last10']: r['referred_by_phone_last10'] for r in cur.fetchall()}
        cur.execute(
            f"SELECT RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) AS phone_last10, "
            f"MAX(name) AS name, MAX(phone) AS phone "
            f"FROM {schema}.leads GROUP BY 1"
        )
        client_info_map = {r['phone_last10']: {'name': r['name'], 'phone': r['phone']} for r in cur.fetchall()}

        # Сколько друзей привёл каждый клиент и сколько заработал на них (2% от суммы
        # выполненных заказов приглашённых) — для отметки в /admin рядом с именем
        cur.execute(
            f"SELECT ga.referred_by_phone_last10 AS inviter, "
            f"COUNT(DISTINCT ga.phone_last10) AS friends_count, "
            f"COALESCE(SUM(CASE WHEN l.status = 'done' THEN l.order_amount ELSE 0 END), 0) AS friends_done_amount "
            f"FROM {schema}.garage_accounts ga "
            f"LEFT JOIN {schema}.leads l ON RIGHT(regexp_replace(l.phone, '\\D', '', 'g'), 10) = ga.phone_last10 "
            f"WHERE ga.referred_by_phone_last10 IS NOT NULL "
            f"GROUP BY 1"
        )
        referral_stats_map = {
            r['inviter']: {
                'friends_count': r['friends_count'],
                'bonus_earned': round(float(r['friends_done_amount'] or 0) * 0.02, 2),
            }
            for r in cur.fetchall()
        }

        # Заметки менеджера, привязанные к номеру телефона (не к конкретной заявке) —
        # видны во всех заявках этого клиента, включая новые
        cur.execute(f"SELECT phone_last10, note FROM {schema}.client_notes")
        notes_map = {r['phone_last10']: r['note'] for r in cur.fetchall()}
        cur.close()
    finally:
        conn.close()

    leads = []
    for r in rows:
        phone_last10 = ''.join(ch for ch in (r['phone'] or '') if ch.isdigit())[-10:]
        inviter_phone_last10 = referred_by_map.get(phone_last10)
        inviter = client_info_map.get(inviter_phone_last10) if inviter_phone_last10 else None
        referral_stats = referral_stats_map.get(phone_last10)
        leads.append({
            'id': r['id'],
            'vin': r['vin'],
            'name': r['name'],
            'phone': r['phone'],
            'parts': r['parts'],
            'messenger': r['messenger'],
            'photo_url': r['photo_url'],
            'photo_urls': list(r['photo_urls']) if r['photo_urls'] else ([r['photo_url']] if r['photo_url'] else []),
            'order_amount': float(r['order_amount']) if r['order_amount'] is not None else None,
            'prepayment': float(r['prepayment']) if r['prepayment'] is not None else None,
            'remaining': float(r['remaining']) if r['remaining'] is not None else None,
            'cashback': float(r['cashback']) if r['cashback'] is not None else None,
            'created_at': r['created_at'].isoformat() if r['created_at'] else None,
            'car_name': r['car_name'],
            'city': r['city'],
            'status': r['status'],
            'completed_at': r['completed_at'].isoformat() if r['completed_at'] else None,
            'arrived': bool(r['arrived']),
            'internal_note': r['internal_note'],
            'archived': bool(r['archived']),
            'mileage': r['mileage'],
            'handled_by': r['handled_by'],
            'garage_blocked': phone_last10 in blocked_phones,
            'phone_verified': phone_last10 in verified_phones,
            'phone_note': notes_map.get(phone_last10),
            'invited_by_name': inviter['name'] if inviter else None,
            'invited_by_phone': inviter['phone'] if inviter else None,
            'friends_invited_count': referral_stats['friends_count'] if referral_stats else 0,
            'referral_bonus_earned': referral_stats['bonus_earned'] if referral_stats else 0,
        })

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'leads': leads})}