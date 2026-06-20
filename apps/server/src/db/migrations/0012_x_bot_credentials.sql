-- Persist X bot OAuth tokens so refresh rotation survives server restarts.
CREATE TABLE IF NOT EXISTS "x_bot_credentials" (
  "bot_username" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
