import base64
import json
import os
import re
import uuid
import psycopg2
import boto3
from send_admin_push import send_push_to_admins
from rate_limit import get_client_ip, check_rate_limit


MAX_PHOTOS = 3


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
    """Принимает заявку с сайта (VIN, имя, телефон, запчасти, мессенджер, до 3 фото) и сохраняет в БД"""
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

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от спама заявками с одного IP: не более 10 заявок за 10 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'leads-submit', max_requests=10, window_seconds=600):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много заявок. Попробуйте позже'})}

    body = json.loads(event.get('body') or '{}')
    vin = (body.get('vin') or '').strip().upper()
    name = (body.get('name') or '').strip()
    phone = (body.get('phone') or '').strip()
    parts = (body.get('parts') or '').strip()
    messenger = (body.get('messenger') or '').strip() or None
    # photos — новый формат (массив base64), photo — старый (один base64), поддерживаем оба
    # ради совместимости, пока не обновлены все клиенты
    photos_base64 = body.get('photos') or ([] if not body.get('photo') else [body.get('photo')])
    photos_base64 = [p for p in photos_base64 if p][:MAX_PHOTOS]
    car_name = (body.get('car_name') or '').strip() or None
    city = (body.get('city') or '').strip() or None
    referral_code = re.sub(r'[^A-Z0-9]', '', (body.get('referral_code') or '').strip().upper())[:10] or None

    # Фото грузим первыми: если хотя бы одно успешно загрузится, VIN становится необязательным.
    # Если фото не прислали или ни одно не удалось загрузить — VIN обязателен, как раньше.
    photo_urls = []
    for photo_base64 in photos_base64:
        try:
            photo_urls.append(upload_photo(photo_base64))
        except Exception:
            continue

    vin_valid = bool(re.fullmatch(r'[A-Z0-9-]{7,20}', vin))
    if not photo_urls and not vin_valid:
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
    # Запчасти: свободный текст, но без символов, из которых можно собрать HTML/скрипт-инъекцию
    if re.search(r'[<>{}`]', parts):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Недопустимые символы в описании запчастей'})}
    if len(parts) < 2 or len(parts) > 1000:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите интересующие запчасти'})}
    # Город: только буквы, пробел и дефис — как на клиенте
    if city and not re.fullmatch(r"[a-zA-Zа-яА-ЯёЁ\s-]{1,20}", city):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный город'})}
    # Название авто: свободный текст, но без символов, из которых можно собрать HTML/скрипт-инъекцию
    if car_name and (re.search(r'[<>{}`]', car_name) or len(car_name) > 25):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректное название автомобиля'})}

    vin_to_save = vin if vin_valid else None

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
        is_first_lead = row is None
        if row:
            name = row[0]
        # Если это самая первая заявка клиента и он указал промокод друга — запоминаем,
        # кто его пригласил (один раз, дальше не меняется). Самоприглашение по своему же
        # коду и код, который никому не принадлежит, тихо игнорируем. Имя пригласившего
        # запоминаем отдельно — подставим в push-уведомление менеджеру.
        referrer_name = None
        if is_first_lead and referral_code:
            cur.execute(
                f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE referral_code = %s",
                (referral_code,),
            )
            ref_row = cur.fetchone()
            if ref_row and ref_row[0] != phone_last10:
                cur.execute(
                    f"INSERT INTO {schema}.garage_accounts (phone_last10, referred_by_phone_last10, updated_at) "
                    f"VALUES (%s, %s, now()) "
                    f"ON CONFLICT (phone_last10) DO UPDATE SET referred_by_phone_last10 = "
                    f"COALESCE(garage_accounts.referred_by_phone_last10, EXCLUDED.referred_by_phone_last10), updated_at = now()",
                    (phone_last10, ref_row[0]),
                )
                cur.execute(
                    f"SELECT name FROM {schema}.leads "
                    f"WHERE RIGHT(regexp_replace(phone, '\\D', '', 'g'), 10) = %s "
                    f"ORDER BY created_at ASC LIMIT 1",
                    (ref_row[0],),
                )
                referrer_row = cur.fetchone()
                referrer_name = referrer_row[0] if referrer_row else None
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
        # photo_url (одиночное поле) сохраняем тоже — для обратной совместимости со старыми
        # местами в коде/экспортах, которые могут его ещё читать; photo_urls — основной массив
        first_photo_url = photo_urls[0] if photo_urls else None
        cur.execute(
            f"INSERT INTO {schema}.leads (vin, name, phone, parts, messenger, photo_url, photo_urls, car_name, city) "
            f"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (vin_to_save, name, phone, parts, messenger, first_photo_url, photo_urls or None, car_name, city),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        cur.close()

        car_label = car_name or vin_to_save or 'без VIN'
        push_body = f'{name}, {phone} — {car_label}'
        if referrer_name:
            push_body += f' (по промокоду от {referrer_name})'
        send_push_to_admins(
            dsn, schema,
            title='Новая заявка',
            body=push_body,
        )
    finally:
        conn.close()

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'id': new_id})}