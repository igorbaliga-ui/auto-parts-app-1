CREATE TABLE IF NOT EXISTS client_cashback_overrides (
    phone_last10 varchar(10) PRIMARY KEY,
    cashback_override numeric(12,2) NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);