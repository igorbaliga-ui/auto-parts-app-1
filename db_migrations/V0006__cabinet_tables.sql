CREATE TABLE IF NOT EXISTS cab_suppliers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'file',
    api_url TEXT,
    api_login TEXT,
    note TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    items_count INTEGER NOT NULL DEFAULT 0,
    price_updated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cab_price_items (
    id BIGSERIAL PRIMARY KEY,
    supplier_id INTEGER NOT NULL,
    article TEXT NOT NULL,
    article_norm TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    price NUMERIC(14,2) NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 0,
    delivery_days INTEGER,
    warehouse TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_cab_price_article ON cab_price_items (article_norm);
CREATE INDEX IF NOT EXISTS idx_cab_price_supplier ON cab_price_items (supplier_id);

CREATE TABLE IF NOT EXISTS cab_markups (
    id SERIAL PRIMARY KEY,
    price_from NUMERIC(14,2) NOT NULL DEFAULT 0,
    percent NUMERIC(7,2) NOT NULL DEFAULT 0,
    rounding INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cab_clients (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT,
    car TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cab_garage (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    owner TEXT,
    vin TEXT,
    plate TEXT,
    model TEXT,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cab_cart (
    id SERIAL PRIMARY KEY,
    article TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    supplier_id INTEGER,
    supplier_name TEXT NOT NULL DEFAULT '',
    delivery_days INTEGER,
    price_buy NUMERIC(14,2) NOT NULL DEFAULT 0,
    price_sale NUMERIC(14,2) NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cab_orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER,
    client_name TEXT,
    client_phone TEXT,
    car TEXT,
    comment TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    total_sale NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_buy NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cab_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    article TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL DEFAULT '',
    supplier_name TEXT NOT NULL DEFAULT '',
    delivery_days INTEGER,
    price_buy NUMERIC(14,2) NOT NULL DEFAULT 0,
    price_sale NUMERIC(14,2) NOT NULL DEFAULT 0,
    qty INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_cab_order_items_order ON cab_order_items (order_id);

CREATE TABLE IF NOT EXISTS cab_search_history (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);