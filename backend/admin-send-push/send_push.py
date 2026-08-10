import json
import os
import re
import psycopg2
from pywebpush import webpush, WebPushException


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:]


def send_push_to_phone(dsn: str, schema: str, phone: str, title: str, body: str) -> int:
    """Отправляет Web Push уведомление всем подпискам, привязанным к номеру телефона.
    Возвращает количество устройств, на которые уведомление успешно отправлено.
    Ошибки отправки не прерывают рассылку — только удаляют протухшие подписки."""
    private_key = os.environ.get('VAPID_PRIVATE_KEY')
    if not private_key:
        return 0

    phone_last10 = _normalize_phone(phone)
    if len(phone_last10) < 10:
        return 0

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id, endpoint, p256dh, auth FROM {schema}.push_subscriptions WHERE phone_last10 = %s",
            (phone_last10,),
        )
        subs = cur.fetchall()
        cur.close()

        sent = 0
        stale_ids = []
        for sub_id, endpoint, p256dh, auth in subs:
            subscription_info = {
                'endpoint': endpoint,
                'keys': {'p256dh': p256dh, 'auth': auth},
            }
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps({'title': title, 'body': body}),
                    vapid_private_key=private_key,
                    vapid_claims={'sub': 'mailto:zapoptom@bk.ru'},
                    ttl=86400,
                )
                sent += 1
            except WebPushException as e:
                status_code = getattr(e.response, 'status_code', None)
                if status_code in (404, 410):
                    stale_ids.append(sub_id)
            except Exception:
                pass

        if stale_ids:
            cur = conn.cursor()
            cur.execute(
                f"DELETE FROM {schema}.push_subscriptions WHERE id = ANY(%s)",
                (stale_ids,),
            )
            conn.commit()
            cur.close()

        return sent
    finally:
        conn.close()
