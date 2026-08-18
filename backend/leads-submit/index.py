import base64
import json
import os
import re
import traceback
import uuid
import psycopg2
import boto3
from send_admin_push import send_push_to_admins
from send_push import send_push_to_phone
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


def notify_admins_about_failure(dsn: str, schema: str, phone: str, exc: Exception) -> None:
    """Шлёт push менеджерам, если сохранение заявки в БД упало с исключением — чтобы такие
    случаи не оставались незамеченными и клиенту не приходилось звонить самому. Ошибку самой
    отправки push (например, если БД вообще недоступна) намеренно проглатываем — клиент в
    любом случае уже получил сообщение об ошибке, а зависать/падать вторично из-за push нельзя."""
    try:
        send_push_to_admins(
            dsn, schema,
            title='Ошибка отправки заявки',
            body=f'Клиент {phone or "с неизвестным номером"} не смог отправить заявку: {exc}'[:300],
        )
    except Exception:
        pass


def handler(event: dict, context) -> dict:
    """Принимает заявку с сайта (VIN, имя, телефон, запчасти, мессенджер, до 3 фото) и сохраняет в БД.
    При самой первой заявке клиента начисляет разовый бонус за регистрацию (сумма для всех
    одна, задаётся менеджером в /admin), если он больше нуля — промокод друга не обязателен.
    Бонус выдаётся строго один раз на номер телефона (флаг в
    garage_accounts.signup_bonus_granted_at) — даже если клиент удалит все свои заявки и
    отправит новую, второй раз бонус не начислится.
    Если сохранение заявки в БД падает с ошибкой — менеджерам сразу приходит push
    «Ошибка отправки заявки», чтобы такие случаи не оставались незамеченными."""
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
    phone_digits = re.sub(r'\D', '', phone)
    if len(phone_digits) < 10 or len(phone_digits) > 11:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный телефон'})}
    # Нормализуем в единый формат +7XXXXXXXXXX, чтобы 8.../7.../900... считались одним номером
    phone_last10 = phone_digits[-10:]
    phone = f'+7{phone_last10}'
    # Имя: только буквы (рус/лат), пробел, дефис и апостроф — как на клиенте.
    # Отсекает попытки протащить в базу HTML/скрипты или прочий мусор через прямой запрос к API.
    # Если номер уже есть в базе — имя не обязательно (подставится из первой заявки клиента,
    # форма для таких клиентов вообще скрывает поле «Имя»). Сам факт наличия/имя проверяем
    # позже одним запросом вместе с is_first_lead — отдельное соединение здесь не нужно.
    name_valid = 2 <= len(name) <= 30 and bool(re.fullmatch(r"[a-zA-Zа-яА-ЯёЁ\s'-]+", name))
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

    # Всё, что дальше работает с БД (сохранение заявки, бонус за регистрацию, привязка
    # промокода), оборачиваем в try/except: если что-то упадёт с исключением, менеджерам
    # сразу летит push «Ошибка отправки заявки», а клиенту — понятная ошибка 500, вместо
    # того чтобы сбой тихо остался незамеченным.
    try:
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
            elif not name_valid:
                cur.close()
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Укажите имя'})}
            # Если это самая первая заявка клиента и он указал промокод друга — запоминаем,
            # кто его пригласил (один раз, дальше не меняется). Самоприглашение по своему же
            # коду и код, который никому не принадлежит, тихо игнорируем. Имя пригласившего
            # запоминаем отдельно — подставим в push-уведомление менеджеру.
            referrer_name = None
            referrer_phone_to_notify = None
            if is_first_lead and referral_code:
                cur.execute(
                    f"SELECT phone_last10 FROM {schema}.garage_accounts WHERE referral_code = %s",
                    (referral_code,),
                )
                ref_row = cur.fetchone()
                if ref_row and ref_row[0] != phone_last10:
                    # referred_by_at фиксирует момент привязки промокода — в реферальный бонус
                    # пригласившему пойдут только заказы друга, выполненные ПОСЛЕ этой даты
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
                    referrer_name = referrer_row[0] if referrer_row else None
                    referrer_phone_to_notify = ref_row[0]
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

            # Разовый бонус за регистрацию: начисляется один раз на номер телефона при первой
            # заявке клиента (промокод друга не обязателен). Сумма общая для всех, задаётся
            # менеджером в /admin («Бонусы клиентов»). Признак «бонус уже выдан» храним в
            # garage_accounts.signup_bonus_granted_at, а НЕ определяем через is_first_lead/наличие
            # заявок в leads — если клиент удалит все свои заявки и создаст новую, is_first_lead
            # снова станет True, но запись в garage_accounts никуда не денется и защитит от
            # повторной выдачи.
            signup_bonus_amount = 0.0
            if is_first_lead:
                cur.execute(f"SELECT signup_bonus_amount FROM {schema}.app_settings WHERE id = 1")
                settings_row = cur.fetchone()
                configured_amount = float(settings_row[0]) if settings_row and settings_row[0] is not None else 0.0
                if configured_amount > 0:
                    # Атомарно занимаем «слот» бонуса в два шага: сначала гарантируем, что строка
                    # для этого номера существует (INSERT ... ON CONFLICT DO NOTHING), затем сам
                    # UPDATE с условием "signup_bonus_granted_at IS NULL" — эта строка блокируется
                    # на время транзакции, поэтому при двух параллельных запросах на один и тот же
                    # номер выиграет только один: RETURNING вернёт строку только победителю, второй
                    # получит пустой результат. (Раньше здесь был однострочный UPSERT с EXCLUDED в
                    # RETURNING — так делать нельзя, Postgres не разрешает ссылаться на EXCLUDED вне
                    # ON CONFLICT DO UPDATE SET, из-за чего заявка падала с ошибкой 42P01.)
                    cur.execute(
                        f"INSERT INTO {schema}.garage_accounts (phone_last10, updated_at) "
                        f"VALUES (%s, now()) ON CONFLICT (phone_last10) DO NOTHING",
                        (phone_last10,),
                    )
                    cur.execute(
                        f"UPDATE {schema}.garage_accounts SET signup_bonus_granted_at = now(), updated_at = now() "
                        f"WHERE phone_last10 = %s AND signup_bonus_granted_at IS NULL "
                        f"RETURNING 1",
                        (phone_last10,),
                    )
                    won_slot = cur.fetchone() is not None
                    if won_slot:
                        signup_bonus_amount = configured_amount
                        cur.execute(
                            f"INSERT INTO {schema}.client_cashback_deductions (phone_last10, amount, type, admin_name) "
                            f"VALUES (%s, %s, 'accrue', 'Бонус за регистрацию')",
                            (phone_last10, signup_bonus_amount),
                        )

            conn.commit()
            cur.close()
        finally:
            conn.close()
    except Exception as exc:
        print(f"leads-submit: failed to save lead for phone={phone}: {exc}")
        print(traceback.format_exc())
        notify_admins_about_failure(dsn, schema, phone, exc)
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': 'Не получилось отправить заявку, обратитесь к менеджеру'}),
        }

    car_label = car_name or vin_to_save or 'без VIN'
    push_body = f'{name}, {phone} — {car_label}'
    if referrer_name:
        push_body += f' (по промокоду от {referrer_name})'
    send_push_to_admins(
        dsn, schema,
        title='Новая заявка',
        body=push_body,
    )
    # Уведомляем пригласившего друга: у него появился новый приглашённый —
    # бонус 2% начислится позже, когда заказ друга будет выполнен
    if referrer_phone_to_notify:
        send_push_to_phone(
            dsn, schema, referrer_phone_to_notify,
            title='Новый приглашённый друг',
            body=f'{name} применил ваш промокод и оставил первую заявку. Бонус начислим, когда его заказ будет выполнен.',
        )
    if signup_bonus_amount > 0:
        bonus_str = f'{signup_bonus_amount:,.0f}'.replace(',', ' ')
        send_push_to_phone(
            dsn, schema, phone,
            title='Бонус за регистрацию',
            body=f'Вам начислено {bonus_str} бонусов за первую заявку. Проверьте баланс в «Гараже».',
        )

    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'success': True, 'id': new_id})}
