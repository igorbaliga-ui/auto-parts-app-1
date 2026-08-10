CREATE TABLE IF NOT EXISTS site_contacts (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    phone_value VARCHAR(50) NOT NULL DEFAULT '+7 (932) 402-79-37',
    phone_href VARCHAR(50) NOT NULL DEFAULT 'tel:+79324027937',
    email_value VARCHAR(100) NOT NULL DEFAULT 'zapoptom@bk.ru',
    email_href VARCHAR(100) NOT NULL DEFAULT 'mailto:zapoptom@bk.ru',
    address_value VARCHAR(255) NOT NULL DEFAULT 'г. Сургут, ул. Республики, 71/3с1',
    hours_value VARCHAR(100) NOT NULL DEFAULT 'Пн–Сб, 9:00–20:00',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_contacts (id) VALUES (1) ON CONFLICT (id) DO NOTHING;