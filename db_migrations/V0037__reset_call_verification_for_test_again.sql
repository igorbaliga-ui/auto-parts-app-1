UPDATE call_verifications
SET status = 'expired'
WHERE phone_last10 = '9955833388' AND status = 'pending';

UPDATE garage_accounts
SET phone_verified = false, phone_verified_at = NULL
WHERE phone_last10 = '9955833388';
