import json
import os
import re
import psycopg2
from rate_limit import get_client_ip, check_rate_limit


def handler(event: dict, context) -> dict:
    """Обновляет название автомобиля для всех заявок клиента с указанным VIN (личный кабинет «Гараж»)"""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от перебора чужих телефон+VIN: не более 20 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'garage-car-name', max_requests=20, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    body = json.loads(event.get('body') or '{}')
    phone = (body.get('phone') or '').strip()
    vin = (body.get('vin') or '').strip().upper()
    car_name = (body.get('car_name') or '').strip()

    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 10:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите корректный телефон'})}
    if not re.fullmatch(r'[A-Z0-9-]{7,20}', vin):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный VIN'})}
    # Название авто: свободный текст, но без символов, из которых можно собрать HTML/скрипт-инъекцию
    if re.search(r'[<>{}`]', car_name):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Недопустимые символы в названии автомобиля'})}
    if len(car_name) > 25:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Название автомобиля — не более 25 символов'})}

    phone_last10 = phone_digits[-10:]

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE {schema}.leads SET car_name = %s "
            f"WHERE vin = %s AND RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s",
            (car_name or None, vin, phone_last10),
        )
        conn.commit()
        cur.close()
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True})}