-- Пометка "Поступил" для заказов в статусе in_progress: деталь пришла на склад, ждёт клиента
ALTER TABLE leads ADD COLUMN arrived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN arrived_at TIMESTAMP WITH TIME ZONE NULL;

-- Подписки клиентов на web push уведомления (привязаны к номеру телефона)
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    phone_last10 VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_push_subscriptions_phone ON push_subscriptions (phone_last10);
