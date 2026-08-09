ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS mileage INTEGER NULL
  CHECK (mileage IS NULL OR (mileage >= 0 AND mileage <= 2000000));