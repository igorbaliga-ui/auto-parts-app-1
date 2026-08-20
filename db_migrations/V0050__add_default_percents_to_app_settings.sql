-- Общие (не привязанные к конкретному клиенту) значения кешбэка и реферального
-- процента "по умолчанию" — используются для публичного отображения на сайте
-- (баннер с бонусной программой) и редактируются менеджером в /admin, рядом
-- с уже существующим бонусом за регистрацию. Индивидуальные проценты конкретных
-- клиентов (garage_accounts.cashback_percent/referral_percent) продолжают
-- работать отдельно и не меняются этой миграцией.
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_cashback_percent numeric(5,2) NOT NULL DEFAULT 3.00;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS default_referral_percent numeric(5,2) NOT NULL DEFAULT 2.00;
