CREATE TYPE "public"."tokenization_status" AS ENUM('pending', 'minting', 'active', 'failed', 'delisted');--> statement-breakpoint
CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"token_mint_address" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"average_buy_price" numeric(18, 9) NOT NULL,
	"total_invested" numeric(18, 9) DEFAULT '0' NOT NULL,
	"total_realized" numeric(18, 9) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reddit_post_id" text NOT NULL,
	"reddit_url" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"subreddit" text NOT NULL,
	"thumbnail" text,
	"content" text,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"reddit_created_at" timestamp with time zone,
	"token_supply" integer NOT NULL,
	"initial_price" numeric(18, 9) NOT NULL,
	"current_price" numeric(18, 9) NOT NULL,
	"description" text,
	"token_mint_address" text,
	"token_symbol" text,
	"token_decimals" integer DEFAULT 9,
	"status" "tokenization_status" DEFAULT 'pending' NOT NULL,
	"total_volume" numeric(18, 9) DEFAULT '0' NOT NULL,
	"market_cap" numeric(18, 9) DEFAULT '0' NOT NULL,
	"holders" integer DEFAULT 0 NOT NULL,
	"creator_id" uuid NOT NULL,
	"creator_rewards" numeric(18, 9) DEFAULT '0' NOT NULL,
	"tags" text[],
	"featured" integer DEFAULT 0 NOT NULL,
	"tokenized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"minted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_reddit_post_id_unique" UNIQUE("reddit_post_id"),
	CONSTRAINT "posts_token_mint_address_unique" UNIQUE("token_mint_address")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;