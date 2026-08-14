ALTER TABLE garage_accounts
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS referred_by_phone_last10 VARCHAR(10) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_garage_accounts_referral_code
  ON garage_accounts (referral_code) WHERE referral_code IS NOT NULL;
