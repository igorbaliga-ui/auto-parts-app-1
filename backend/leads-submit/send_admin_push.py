import json
import os
import psycopg2
from pywebpush import webpush, WebPushException


def send_push_to_admins(dsn: str, schema: str, title: str, body: str, url: str = '/admin') -> None:
    """Отправляет Web Push уведомление всем менеджерам, подписавшимся в админке (/admin).
    Ошибки отправки не прерывают основной запрос — только удаляют протухшие подписки."""
    private_key = os.environ.get('VAPID_PRIVATE_KEY')
    if not private_key:
        return

    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(f"SELECT id, endpoint, p256dh, auth FROM {schema}.admin_push_subscriptions")
        subs = cur.fetchall()
        cur.close()

        stale_ids = []
        for sub_id, endpoint, p256dh, auth in subs:
            subscription_info = {
                'endpoint': endpoint,
                'keys': {'p256dh': p256dh, 'auth': auth},
            }
            try:
                webpush(
                    subscription_info=subscription_info,
                    data=json.dumps({'title': title, 'body': body, 'url': url}),
                    vapid_private_key=private_key,
                    vapid_claims={'sub': 'mailto:zapoptom@bk.ru'},
                    ttl=86400,
                )
            except WebPushException as e:
                status_code = getattr(e.response, 'status_code', None)
                if status_code in (404, 410):
                    stale_ids.append(sub_id)
            except Exception:
                pass

        if stale_ids:
            cur = conn.cursor()
            cur.execute(
                f"DELETE FROM {schema}.admin_push_subscriptions WHERE id = ANY(%s)",
                (stale_ids,),
            )
            conn.commit()
            cur.close()
    finally:
        conn.close()