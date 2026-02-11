CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reddit_id" text NOT NULL,
	"username" text,
	"wallet_address" text,
	"email" text,
	"avatar_url" text,
	"bio" text,
	"points" integer DEFAULT 0 NOT NULL,
	"total_posts_tokenized" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_reddit_id_unique" UNIQUE("reddit_id"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address")
);
