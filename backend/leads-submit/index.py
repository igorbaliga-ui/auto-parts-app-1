import base64
import json
import os
import re
import uuid
import psycopg2
import boto3
from send_admin_push import send_push_to_admins


def upload_photo(photo_base64: str) -> str:
    """Декодирует base64-фото и загружает его в S3, возвращает CDN-ссылку"""
    header, _, data = photo_base64.partition(',')
    if data == '':
        data = header
        ext = 'jpg'
    else:
        ext = 'jpg'
        if 'png' in header:
            ext = 'png'
        elif 'webp' in header:
            ext = 'webp'
    file_bytes = base64.b64decode(data)

    s3 = boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
    )
    key = f"leads-photos/{uuid.uuid4()}.{ext}"
    s3.put_object(Bucket='files', Key=key, Body=file_bytes, ContentType=f'image/{ext}')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта (VIN, имя, телефон, запчасти, мессенджер, фото СТС) и сохраняет в БД"""
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
    photo_base64 = body.get('photo') or None
    car_name = (body.get('car_name') or '').strip() or None
    city = (body.get('city') or '').strip() or None

    # Фото грузим первым: если оно успешно загрузится, VIN становится необязательным.
    # Если фото не прислали или его не удалось загрузить — VIN обязателен, как раньше.
    photo_url = None
    if photo_base64:
        try:
            photo_url = upload_photo(photo_base64)
        except Exception:
            photo_url = None

    vin_valid = bool(re.fullmatch(r'[A-Z0-9]{11,17}', vin))
    if not photo_url and not vin_valid:
        return {
            'statusCode': 400,
            'headers': headers,
            'body': json.dumps({'error': 'Укажите VIN — фото не приложено или не удалось загрузить'}),
        }
    # Имя: только буквы (рус/лат), пробел, дефис и апостроф — как на клиенте.
    # Отсекает попытки протащить в базу HTML/скрипты или прочий мусор через прямой запрос к API.
    if not (2 <= len(name) <= 30) or not re.fullmatch(r"[a-zA-Zа-яА-ЯёЁ\s'-]+", name):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите имя'})}
    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 10 or len(phone_digits) > 11:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}
    # Нормализуем в единый формат +7XXXXXXXXXX, чтобы 8.../7.../900... считались одним номером
    phone_last10 = phone_digits[-10:]
    phone = f'+7{phone_last10}'
    if messenger not in ('telegram', 'max', 'whatsapp'):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Выберите мессенджер'})}
    if len(parts) < 2:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите интересующие запчасти'})}

    vin_to_save = vin if vin_valid else None

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        # К номеру телефона закрепляется только одно имя — то, что было указано в самой первой заявке
        cur.execute(
            f"SELECT name FROM {schema}.leads "
            f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
            f"ORDER BY created_at ASC LIMIT 1",
            (phone_last10,),
        )
        row = cur.fetchone()
        if row:
            name = row[0]
        # Если название авто не передали явно — подтягиваем его из другой заявки с тем же VIN
        if not car_name and vin_to_save:
            cur.execute(
                f"SELECT car_name FROM {schema}.leads "
                f"WHERE vin = %s AND car_name IS NOT NULL LIMIT 1",
                (vin_to_save,),
            )
            row = cur.fetchone()
            if row:
                car_name = row[0]
        cur.execute(
            f"INSERT INTO {schema}.leads (vin, name, phone, parts, messenger, photo_url, car_name, city) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (vin_to_save, name, phone, parts, messenger, photo_url, car_name, city),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()

        car_label = car_name or vin_to_save or 'без VIN'
        send_push_to_admins(
            dsn, schema,
            title='Новая заявка',
            body=f'{name}, {phone} — {car_label}',
        )
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'id': new_id})}