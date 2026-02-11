CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"price_per_token" numeric(18, 9) NOT NULL,
	"total_value" numeric(18, 9) NOT NULL,
	"signature" text NOT NULL,
	"token_mint_address" text NOT NULL,
	"wallet_address" text NOT NULL,
	"network_fee" numeric(18, 9) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(18, 9) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;