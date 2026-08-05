CREATE TABLE garage_accounts (
    phone_last10 varchar(10) PRIMARY KEY,
    password_hash text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);