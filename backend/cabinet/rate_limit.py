import datetime
import psycopg2


def get_client_ip(event: dict) -> str:
    """Достаёт настоящий IP клиента: сначала из requestContext (заполняется платформой),
    затем из заголовка X-Forwarded-For как запасной вариант."""
    ctx = event.get('requestContext') or {}
    identity = ctx.get('identity') or {}
    ip = identity.get('sourceIp')
    if ip:
        return ip
    headers = event.get('headers') or {}
    xff = headers.get('X-Forwarded-For') or headers.get('x-forwarded-for')
    if xff:
        return xff.split(',')[0].strip()
    return 'unknown'


def check_rate_limit(dsn: str, schema: str, ip: str, endpoint: str, max_requests: int, window_seconds: int) -> bool:
    """Простой rate limiter с фиксированным окном на базе таблицы rate_limits.
    Возвращает True, если запрос разрешён, False — если лимит для этого IP на этот endpoint исчерпан.
    Если IP определить не удалось — не блокируем (лучше пропустить, чем заблокировать всех)."""
    if not ip or ip == 'unknown':
        return True

    bucket_key = f"{endpoint}:{ip}"
    conn = psycopg2.connect(dsn)
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT window_start, request_count FROM {schema}.rate_limits WHERE bucket_key = %s FOR UPDATE",
            (bucket_key,),
        )
        row = cur.fetchone()
        now = datetime.datetime.now(datetime.timezone.utc)

        if row is None:
            cur.execute(
                f"INSERT INTO {schema}.rate_limits (bucket_key, window_start, request_count) "
                f"VALUES (%s, now(), 1) ON CONFLICT (bucket_key) DO NOTHING",
                (bucket_key,),
            )
            conn.commit()
            return True

        window_start, count = row
        if (now - window_start).total_seconds() > window_seconds:
            cur.execute(
                f"UPDATE {schema}.rate_limits SET window_start = now(), request_count = 1 WHERE bucket_key = %s",
                (bucket_key,),
            )
            conn.commit()
            return True

        if count >= max_requests:
            conn.commit()
            return False

        cur.execute(
            f"UPDATE {schema}.rate_limits SET request_count = request_count + 1 WHERE bucket_key = %s",
            (bucket_key,),
        )
        conn.commit()
        return True
    finally:
        conn.close()
