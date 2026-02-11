ALTER TABLE "posts" ADD COLUMN "dbc_pool_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "dbc_config_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_dbc_pool_address_unique" UNIQUE("dbc_pool_address");