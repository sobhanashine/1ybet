CREATE TABLE "chip_stacks" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"chips" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chip_wagers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"match_id" integer NOT NULL,
	"pred_home" integer NOT NULL,
	"pred_away" integer NOT NULL,
	"amount" integer NOT NULL,
	"settled" boolean DEFAULT false NOT NULL,
	"delta" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chip_stacks" ADD CONSTRAINT "chip_stacks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_wagers" ADD CONSTRAINT "chip_wagers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chip_wagers" ADD CONSTRAINT "chip_wagers_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chip_wager_user_match_idx" ON "chip_wagers" USING btree ("user_id","match_id");--> statement-breakpoint
CREATE INDEX "chip_wager_user_idx" ON "chip_wagers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chip_wager_settled_idx" ON "chip_wagers" USING btree ("settled");