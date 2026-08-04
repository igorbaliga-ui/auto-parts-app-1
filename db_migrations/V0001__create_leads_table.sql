CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    vin VARCHAR(17) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    parts TEXT,
    messenger VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
