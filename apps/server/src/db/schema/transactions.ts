import { pgTable, text, timestamp, integer, numeric, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { posts } from "./posts";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  postId: uuid("post_id").references(() => posts.id).notNull(),
  
  // Transaction details
  type: text("type").notNull(), // 'buy' | 'sell'
  amount: integer("amount").notNull(), // Number of tokens
  pricePerToken: numeric("price_per_token", { precision: 18, scale: 9 }).notNull(), // Price at time of trade
  totalValue: numeric("total_value", { precision: 18, scale: 9 }).notNull(), // Total SOL spent/received
  
  // Blockchain data
  signature: text("signature").notNull().unique(), // Solana transaction signature
  tokenMintAddress: text("token_mint_address").notNull(),
  walletAddress: text("wallet_address").notNull(),
  
  // Fees and slippage
  networkFee: numeric("network_fee", { precision: 18, scale: 9 }).default("0").notNull(),
  platformFee: numeric("platform_fee", { precision: 18, scale: 9 }).default("0").notNull(),
  
  // Status
  status: text("status").default("confirmed").notNull(), // 'pending' | 'confirmed' | 'failed'
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});


