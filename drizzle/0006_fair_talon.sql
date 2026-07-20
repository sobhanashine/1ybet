CREATE TYPE "public"."tournament_payment_status" AS ENUM('PENDING', 'PAID', 'UNPAID');--> statement-breakpoint
ALTER TABLE "tournament_members" ADD COLUMN "payment_status" "tournament_payment_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament_members" ADD COLUMN "payment_responded_at" timestamp with time zone;