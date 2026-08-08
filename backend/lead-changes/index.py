import json
import os

import psycopg2
import psycopg2.extras
from rate_limit import get_client_ip, check_rate_limit

FIELD_LABEL = {
    'order_amount': 'Сумма заказа',
    'prepayment': 'Предоплата',
    'status': 'Статус',
    'arrived': 'Поступил',
    'internal_note': 'Заметка',
    'vin': 'VIN',
    'name': 'Имя',
    'phone': 'Телефон',
    'city': 'Город',
    'messenger': 'Мессенджер',
    'parts': 'Запчасти',
    'car_name': 'Авто',
}


def handler(event: dict, context) -> dict:
    """Отдаёт журнал изменений (кто и когда менял сумму, предоплату, статус) по одной заявке — для /admin"""
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
    if not check_rate_limit(dsn, schema, client_ip, 'lead-changes', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    params = event.get('queryStringParameters') or {}
    lead_id_raw = params.get('lead_id')

    if not lead_id_raw or not lead_id_raw.isdigit():
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    lead_id = int(lead_id_raw)

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            f"SELECT id, admin_name, field, old_value, new_value, changed_at "
            f"FROM {schema}.lead_changes WHERE lead_id = %s ORDER BY changed_at DESC LIMIT 200",
            (lead_id,),
        )
        rows = cur.fetchall()
        cur.close()
    finally:
        conn.close()

    changes = []
    for r in rows:
        changes.append({
            'id': r['id'],
            'admin_name': r['admin_name'],
            'field': r['field'],
            'field_label': FIELD_LABEL.get(r['field'], r['field']),
            'old_value': r['old_value'],
            'new_value': r['new_value'],
            'changed_at': r['changed_at'].isoformat() if r['changed_at'] else None,
        })

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'changes': changes})}