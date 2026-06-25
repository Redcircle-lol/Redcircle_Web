-- Comments on tokenized posts. Supports one level of threaded replies via parent_id.

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  uuid,
  body       text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Supports listing all comments for a post in chronological order.
CREATE INDEX IF NOT EXISTS post_comments_post_idx  ON post_comments (post_id, created_at ASC);

-- Supports listing all comments by a user (profile/moderation).
CREATE INDEX IF NOT EXISTS post_comments_user_idx  ON post_comments (user_id);

-- Speeds up joining replies to their parent when nesting threads.
CREATE INDEX IF NOT EXISTS post_comments_parent_idx ON post_comments (parent_id);
