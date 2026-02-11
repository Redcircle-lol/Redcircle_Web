import { pgTable, text, integer, timestamp, uuid, decimal } from "drizzle-orm/pg-core";

export const holdings = pgTable("holdings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  postId: uuid("post_id").notNull(),
  tokenMintAddress: text("token_mint_address").notNull(),
  amount: integer("amount").notNull().default(0),
  averageBuyPrice: decimal("average_buy_price", { precision: 18, scale: 9 }).notNull(),
  totalInvested: decimal("total_invested", { precision: 18, scale: 9 }).notNull().default("0"),
  totalRealized: decimal("total_realized", { precision: 18, scale: 9 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});


