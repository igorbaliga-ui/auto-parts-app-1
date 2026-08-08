CREATE TABLE IF NOT EXISTS client_notes (
    phone_last10 VARCHAR(10) PRIMARY KEY,
    note TEXT NOT NULL,
    admin_name VARCHAR(100),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);