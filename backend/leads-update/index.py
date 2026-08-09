import json
import os
import re
import psycopg2
from send_push import send_push_to_phone
from rate_limit import get_client_ip, check_rate_limit

STATUS_LABEL = {'new': 'Новая', 'in_progress': 'В работе', 'done': 'Выполнен'}

# Текстовые поля, которые можно частично обновлять по одному (клик-редактирование в /admin)
TEXT_FIELDS = ['vin', 'name', 'phone', 'city', 'messenger', 'parts', 'car_name']

# Поля, для которых пустая строка означает «очистить» (сохраняем NULL, а не '')
NULLABLE_TEXT_FIELDS = ['vin', 'city', 'messenger', 'parts', 'car_name']


def fmt_amount(v):
    return None if v is None else str(float(v))


def fmt_status(v):
    return None if v is None else STATUS_LABEL.get(v, v)


def fmt_arrived(v):
    if v is None:
        return None
    return 'Да' if v else 'Нет'


def normalize_text_field(field: str, value):
    if value is None:
        return None
    value = value.strip()
    if field == 'vin':
        value = value.upper()
    if not value and field in NULLABLE_TEXT_FIELDS:
        return None
    return value


def log_change(cur, schema: str, lead_id: int, admin_name: str, field: str, old_value, new_value):
    if old_value == new_value:
        return
    cur.execute(
        f"INSERT INTO {schema}.lead_changes (lead_id, admin_name, field, old_value, new_value) "
        f"VALUES (%s, %s, %s, %s, %s)",
        (lead_id, admin_name, field, old_value, new_value),
    )


def handler(event: dict, context) -> dict:
    """Частично обновляет заявку по id (для менеджера в /admin): сумму заказа, предоплату, статус
    (new/in_progress/done), пометку «Поступил», признак архива, внутреннюю заметку, а также VIN,
    имя, телефон, город, мессенджер, запчасти и название авто. Обновляются только те поля, что
    реально переданы в запросе. Остаток и кэшбэк — вычисляемые колонки в БД, пересчитываются автоматически.
    Каждое изменение записывается в журнал lead_changes (кто и когда менял).
    При простановке пометки «Поступил», переводе в статус «В работе» (из «Новая») или
    «Выполнен» отправляет клиенту Web Push уведомление."""
    method = event.get('httpMethod', 'GET')

    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
                'Access-Control-Max-Age': '86400',
            },
            'body': '',
        }

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}

    if method != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}

    dsn = os.environ['DATABASE_URL']
    schema = os.environ['MAIN_DB_SCHEMA']

    # Защита от подбора пароля администратора: не более 60 запросов с одного IP за 5 минут
    client_ip = get_client_ip(event)
    if not check_rate_limit(dsn, schema, client_ip, 'leads-update', max_requests=60, window_seconds=300):
        return {'statusCode': 429, 'headers': headers, 'body': json.dumps({'error': 'Слишком много запросов. Попробуйте позже'})}

    req_headers = event.get('headers') or {}
    password = req_headers.get('X-Admin-Password') or req_headers.get('x-admin-password')
    admin_password = os.environ.get('ADMIN_PASSWORD')

    if not admin_password or password != admin_password:
        return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный пароль'})}

    body = json.loads(event.get('body') or '{}')
    lead_id = body.get('id')
    admin_name = (body.get('admin_name') or '').strip() or 'Менеджер'

    if not isinstance(lead_id, int):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный id заявки'})}

    status = body.get('status')
    if status is not None and status not in ('new', 'in_progress', 'done'):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный статус'})}

    archived = body.get('archived')
    if archived is not None and not isinstance(archived, bool):
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректное значение архива'})}

    if 'name' in body and not (body.get('name') or '').strip():
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Имя не может быть пустым'})}

    if 'phone' in body and not (body.get('phone') or '').strip():
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Телефон не может быть пустым'})}

    if 'vin' in body:
        raw_vin = (body.get('vin') or '').strip().upper()
        if raw_vin and not re.fullmatch(r'[A-Z0-9]{11,17}', raw_vin):
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный VIN'})}

    mileage_value = None
    if 'mileage' in body:
        raw_mileage = body.get('mileage')
        if raw_mileage not in (None, ''):
            mileage_str = str(raw_mileage).strip()
            if not re.fullmatch(r'\d{1,7}', mileage_str):
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пробег — только цифры'})}
            mileage_value = int(mileage_str)
            if mileage_value < 0 or mileage_value > 2000000:
                return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Некорректный пробег'})}

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()

        # Читаем текущие значения для журнала изменений
        cur.execute(
            f"SELECT order_amount, prepayment, status, arrived, internal_note, "
            f"vin, name, phone, city, messenger, parts, car_name, archived, mileage "
            f"FROM {schema}.leads WHERE id = %s",
            (lead_id,),
        )
        prev = cur.fetchone()
        if not prev:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Заявка не найдена'})}
        (prev_amount, prev_prepayment, prev_status, prev_arrived, prev_note,
         prev_vin, prev_name, prev_phone, prev_city, prev_messenger, prev_parts, prev_car_name,
         prev_archived, prev_mileage) = prev

        set_clauses = []
        params = []
        text_values = {}
        note_value = None

        if 'order_amount' in body:
            set_clauses.append("order_amount = %s")
            params.append(body['order_amount'])
        if 'prepayment' in body:
            set_clauses.append("prepayment = %s")
            params.append(body['prepayment'])
        if 'internal_note' in body:
            raw_note = body['internal_note']
            note_value = raw_note.strip() if isinstance(raw_note, str) and raw_note.strip() else None
            set_clauses.append("internal_note = %s")
            params.append(note_value)
        if 'mileage' in body:
            set_clauses.append("mileage = %s")
            params.append(mileage_value)

        for field in TEXT_FIELDS:
            if field in body:
                value = normalize_text_field(field, body[field])
                text_values[field] = value
                set_clauses.append(f"{field} = %s")
                params.append(value)

        arrived = body.get('arrived')

        if status is not None:
            set_clauses.append("status = %s")
            params.append(status)
            if status == 'done':
                set_clauses.append("completed_at = COALESCE(completed_at, now())")
            else:
                set_clauses.append("completed_at = NULL")
            if status == 'in_progress':
                set_clauses.append("in_progress_at = COALESCE(in_progress_at, now())")

        if arrived is not None:
            set_clauses.append("arrived = %s")
            params.append(arrived)
            if arrived:
                set_clauses.append("arrived_at = COALESCE(arrived_at, now())")
            else:
                set_clauses.append("arrived_at = NULL")

        if archived is not None:
            set_clauses.append("archived = %s")
            params.append(archived)
            if archived:
                set_clauses.append("archived_at = now()")
            else:
                set_clauses.append("archived_at = NULL")

        if not set_clauses:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Нечего сохранять'})}

        params.append(lead_id)
        cur.execute(
            f"UPDATE {schema}.leads SET {', '.join(set_clauses)} WHERE id = %s "
            f"RETURNING cashback, remaining, completed_at, phone, car_name, vin",
            params,
        )
        row = cur.fetchone()
        cashback = float(row[0]) if row and row[0] is not None else None
        remaining = float(row[1]) if row and row[1] is not None else None
        completed_at = row[2].isoformat() if row and row[2] else None

        # Записываем изменения в журнал
        if 'order_amount' in body:
            log_change(cur, schema, lead_id, admin_name, 'order_amount', fmt_amount(prev_amount), fmt_amount(body['order_amount']))
        if 'prepayment' in body:
            log_change(cur, schema, lead_id, admin_name, 'prepayment', fmt_amount(prev_prepayment), fmt_amount(body['prepayment']))
        if 'internal_note' in body:
            log_change(cur, schema, lead_id, admin_name, 'internal_note', prev_note, note_value)
        if 'mileage' in body:
            log_change(cur, schema, lead_id, admin_name, 'mileage',
                       str(prev_mileage) if prev_mileage is not None else None,
                       str(mileage_value) if mileage_value is not None else None)
        if status is not None:
            log_change(cur, schema, lead_id, admin_name, 'status', fmt_status(prev_status), fmt_status(status))
        if arrived is not None:
            log_change(cur, schema, lead_id, admin_name, 'arrived', fmt_arrived(prev_arrived), fmt_arrived(arrived))
        if archived is not None:
            log_change(cur, schema, lead_id, admin_name, 'archived', fmt_arrived(prev_archived), fmt_arrived(archived))

        text_prev = {
            'vin': prev_vin, 'name': prev_name, 'phone': prev_phone, 'city': prev_city,
            'messenger': prev_messenger, 'parts': prev_parts, 'car_name': prev_car_name,
        }
        for field in TEXT_FIELDS:
            if field in body:
                log_change(cur, schema, lead_id, admin_name, field, text_prev[field], text_values[field])

        conn.commit()
        cur.close()

        # Уведомляем клиента о смене статуса заказа
        if row:
            phone, car_name, vin = row[3], row[4], row[5]
            car_label = car_name or vin or 'ваш заказ'
            if arrived is True:
                send_push_to_phone(
                    dsn, schema, phone,
                    title='Деталь поступила',
                    body=f'{car_label}: заказанная деталь поступила и ждёт вас.',
                )
            elif status == 'done':
                send_push_to_phone(
                    dsn, schema, phone,
                    title='Заказ выполнен',
                    body=f'{car_label}: заказ выполнен. Спасибо, что выбрали нас!',
                )
            elif status == 'in_progress' and prev_status == 'new':
                send_push_to_phone(
                    dsn, schema, phone,
                    title='Заказ в работе',
                    body=f'{car_label}: заказ взят в работу.',
                )
    finally:
        conn.close()

    return {
        'statusCode': 200,
        'headers': headers,
        'body': json.dumps({'success': True, 'cashback': cashback, 'remaining': remaining, 'completed_at': completed_at}),
    }