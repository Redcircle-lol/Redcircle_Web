import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

export const postComments = pgTable(
  "post_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // null = top-level; non-null = reply to another comment (one level deep)
    parentId: uuid("parent_id"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("post_comments_post_idx").on(t.postId),
    index("post_comments_parent_idx").on(t.parentId),
    index("post_comments_user_idx").on(t.userId),
  ],
);

export type PostComment = typeof postComments.$inferSelect;
export type NewPostComment = typeof postComments.$inferInsert;
