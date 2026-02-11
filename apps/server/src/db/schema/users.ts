import { pgTable, text, timestamp, integer, boolean, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Reddit Auth
  redditId: text("reddit_id").unique().notNull(),
  username: text("username").unique(), // Reddit username
  
  // Blockchain
  walletAddress: text("wallet_address").unique(),
  
  // Profile
  email: text("email"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  
  // Gamification
  points: integer("points").default(0).notNull(),
  totalPostsTokenized: integer("total_posts_tokenized").default(0).notNull(),
  
  // Status
  isVerified: boolean("is_verified").default(false).notNull(),
  
  // Timestamps
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

