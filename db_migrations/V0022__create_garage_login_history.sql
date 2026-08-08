CREATE TABLE IF NOT EXISTS garage_login_history (
    id SERIAL PRIMARY KEY,
    phone_last10 VARCHAR(10) NOT NULL,
    login_type VARCHAR(20) NOT NULL,
    user_agent TEXT,
    ip VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garage_login_history_phone
    ON garage_login_history (phone_last10, created_at DESC);