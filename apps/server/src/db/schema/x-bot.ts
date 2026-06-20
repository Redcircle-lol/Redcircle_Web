import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Processed @redcircle mentions — prevents duplicate replies after restarts. */
export const xBotMentions = pgTable("x_bot_mentions", {
  mentionTweetId: text("mention_tweet_id").primaryKey(),
  replyTweetId: text("reply_tweet_id"),
  targetPostUrl: text("target_post_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** OAuth tokens for the bot — survives refresh rotation across Render restarts. */
export const xBotCredentials = pgTable("x_bot_credentials", {
  botUsername: text("bot_username").primaryKey(),
  userId: text("user_id").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
