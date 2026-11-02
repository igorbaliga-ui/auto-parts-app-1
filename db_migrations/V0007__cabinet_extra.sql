ALTER TABLE cab_cart ADD COLUMN IF NOT EXISTS draft BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS cab_priority_brands (
    brand TEXT PRIMARY KEY,
    pos INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cab_crosses (
    id SERIAL PRIMARY KEY,
    article_norm TEXT NOT NULL,
    article TEXT NOT NULL,
    cross_norm TEXT NOT NULL,
    cross_article TEXT NOT NULL,
    cross_brand TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (article_norm, cross_norm)
);
CREATE INDEX IF NOT EXISTS idx_cab_crosses_a ON cab_crosses (article_norm);
CREATE INDEX IF NOT EXISTS idx_cab_crosses_c ON cab_crosses (cross_norm);

CREATE TABLE IF NOT EXISTS cab_price_uploads (
    id SERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    rows_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);