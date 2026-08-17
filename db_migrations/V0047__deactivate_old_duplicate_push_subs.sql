UPDATE push_subscriptions SET phone_last10 = concat('old', id::text)
WHERE phone_last10 = '9324027937' AND created_at < '2026-08-17 17:25:00+00';