CREATE TABLE IF NOT EXISTS client_cashback_deductions (
    id SERIAL PRIMARY KEY,
    phone_last10 varchar(10) NOT NULL,
    amount numeric(12,2) NOT NULL,
    admin_name varchar(100),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_cashback_deductions_phone ON client_cashback_deductions (phone_last10);