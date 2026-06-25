-- Platform upvotes: one row per (post, user), distinct from `posts.upvotes`
-- which is the source Reddit/X engagement score.

-- Denormalized counter on posts — kept in sync transactionally by the API.
-- Default 0 so all existing rows are valid without a data migration.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS vote_count integer NOT NULL DEFAULT 0;

-- Index supports ORDER BY vote_count DESC for the "Top Voted" feed sort.
CREATE INDEX IF NOT EXISTS posts_vote_count_idx ON posts (vote_count DESC);

-- Per-user upvote records.
CREATE TABLE IF NOT EXISTS post_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enforces one upvote per (post, user); the API uses ON CONFLICT DO NOTHING against this.
CREATE UNIQUE INDEX IF NOT EXISTS post_votes_post_user_unique ON post_votes (post_id, user_id);

-- Supports lookups of all posts a user has voted on (vote status batch fetch).
CREATE INDEX IF NOT EXISTS post_votes_user_idx ON post_votes (user_id);
