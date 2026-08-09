ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS photo_urls TEXT[];

-- Переносим уже существующие одиночные фото в новый массив, чтобы не потерять историю
UPDATE leads
SET photo_urls = ARRAY[photo_url]
WHERE photo_url IS NOT NULL AND photo_urls IS NULL;