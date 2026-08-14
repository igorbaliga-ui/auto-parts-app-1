UPDATE garage_accounts SET phone_verified = true, phone_verified_at = COALESCE(phone_verified_at, updated_at, now())
WHERE phone_verified = false;
