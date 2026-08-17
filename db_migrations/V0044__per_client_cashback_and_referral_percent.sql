ALTER TABLE garage_accounts ADD COLUMN IF NOT EXISTS cashback_percent numeric(5,2) NOT NULL DEFAULT 3.00;
ALTER TABLE garage_accounts ADD COLUMN IF NOT EXISTS referral_percent numeric(5,2) NOT NULL DEFAULT 2.00;

ALTER TABLE leads RENAME COLUMN cashback TO cashback_legacy_generated;
ALTER TABLE leads ADD COLUMN cashback numeric(12,2) NULL;
UPDATE leads SET cashback = cashback_legacy_generated;