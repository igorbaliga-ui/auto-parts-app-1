-- Журнал сбоев приложения на устройствах клиентов (ошибки рендера React,
-- перехваченные ErrorBoundary) — чтобы менеджер сразу получал push и мог
-- посмотреть историю случаев, аналогично lead_submit_errors.
CREATE TABLE client_app_errors (
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT NULL,
    url TEXT NULL,
    user_agent TEXT NULL,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_app_errors_created_at ON client_app_errors (created_at DESC);
