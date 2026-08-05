ALTER TABLE leads ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'in_progress';
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('in_progress', 'done'));