import { pgTable, uuid, decimal, integer, timestamp } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  price: decimal("price", { precision: 18, scale: 9 }).notNull(),
  volume: decimal("volume", { precision: 18, scale: 9 }).default("0"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export type PriceHistory = typeof priceHistory.$inferSelect;
export type NewPriceHistory = typeof priceHistory.$inferInsert;

