-- Журнал ошибок при отправке заявки клиентом (например, сбой БД) — чтобы менеджер
-- мог посмотреть все случаи сбоев за последнее время, а не только получить пуш
CREATE TABLE lead_submit_errors (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NULL,
    error_message TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lead_submit_errors_created_at ON lead_submit_errors (created_at DESC);
