ALTER TABLE leads RENAME COLUMN cashback TO cashback_legacy;
ALTER TABLE leads ADD COLUMN cashback numeric(12,2) GENERATED ALWAYS AS (ROUND(order_amount * 0.03, 2)) STORED;
