-- Safe: adds a discriminator column with DEFAULT 'reddit' so all existing
-- Reddit posts are unaffected. No renames, no drops, no data migration needed.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'reddit';
