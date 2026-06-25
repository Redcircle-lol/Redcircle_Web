import { pgTable, uuid, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

/**
 * Platform upvotes — one row per (post, user).
 *
 * This is distinct from `posts.upvotes`, which is the *source* engagement
 * metric scraped from Reddit/X (post score / likes). `post_votes` records
 * RedCircle users who upvoted a post on our platform, and the denormalized
 * `posts.voteCount` mirrors COUNT(*) here so the feed can sort efficiently.
 *
 * The (post_id, user_id) unique index guarantees a user can upvote a post at
 * most once; the API relies on ON CONFLICT DO NOTHING against it.
 */
export const postVotes = pgTable(
  "post_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("post_votes_post_user_unique").on(t.postId, t.userId),
    index("post_votes_user_idx").on(t.userId),
  ],
);

export type PostVote = typeof postVotes.$inferSelect;
export type NewPostVote = typeof postVotes.$inferInsert;
