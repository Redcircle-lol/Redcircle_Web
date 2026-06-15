-- Allow X-only users (no Reddit account) by making reddit_id nullable.
-- Existing rows are unaffected — they already have a reddit_id value.
ALTER TABLE users ALTER COLUMN reddit_id DROP NOT NULL;

-- X (Twitter) auth columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_id       text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_username text UNIQUE;
