ALTER TABLE live_commerce.lives
ADD COLUMN IF NOT EXISTS stock_limit integer NOT NULL DEFAULT 3;

NOTIFY pgrst, 'reload schema';
