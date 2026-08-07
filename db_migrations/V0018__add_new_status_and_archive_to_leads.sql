ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE leads ADD CONSTRAINT leads_status_check CHECK (status IN ('new', 'in_progress', 'done'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone NULL;
CREATE INDEX IF NOT EXISTS idx_leads_archived ON leads (archived);
