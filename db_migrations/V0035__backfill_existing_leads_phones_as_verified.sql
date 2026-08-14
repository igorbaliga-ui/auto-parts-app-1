INSERT INTO garage_accounts (phone_last10, phone_verified, phone_verified_at)
SELECT DISTINCT RIGHT(regexp_replace(phone, '\D', '', 'g'), 10), true, now()
FROM leads
WHERE RIGHT(regexp_replace(phone, '\D', '', 'g'), 10) <> ''
ON CONFLICT (phone_last10) DO UPDATE SET phone_verified = true, phone_verified_at = COALESCE(garage_accounts.phone_verified_at, now());
