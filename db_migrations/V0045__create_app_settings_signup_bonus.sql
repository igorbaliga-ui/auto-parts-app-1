CREATE TABLE IF NOT EXISTS app_settings (
    id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    signup_bonus_amount numeric(12,2) NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings (id, signup_bonus_amount) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;