-- Внутренняя заметка менеджера по заявке, невидимая клиенту
ALTER TABLE leads ADD COLUMN internal_note TEXT NULL;
