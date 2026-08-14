UPDATE garage_accounts
SET phone_verified = false, phone_verified_at = NULL
WHERE phone_last10 = '9955833388';
