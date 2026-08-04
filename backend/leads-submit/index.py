import json
import os
import re
import psycopg2


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта (VIN, имя, телефон, запчасти, мессенджер) и сохраняет в БД"""
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

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    body = json.loads(event.get('body') or '{}')
    vin = (body.get('vin') or '').strip().upper()
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    parts = (body.get('parts') or '').strip()
    messenger = (body.get('messenger') or '').strip() or None

    if len(vin) < 11 or len(vin) > 17:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный VIN'})}
    if len(name) < 2:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите имя'})}
    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}
    if messenger not in ('telegram', 'max', 'whatsapp'):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Выберите мессенджер'})}
    if len(parts) < 2:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите интересующие запчасти'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {schema}.leads (vin, name, phone, parts, messenger) "
            f"VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (vin, name, phone, parts, messenger),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'id': new_id})}