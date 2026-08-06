-- Журнал изменений по заявкам: кто и когда менял сумму заказа, статус, предоплату
CREATE TABLE lead_changes (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER NOT NULL,
    admin_name VARCHAR(100) NOT NULL,
    field VARCHAR(30) NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_changes_lead_id ON lead_changes (lead_id, changed_at DESC);
