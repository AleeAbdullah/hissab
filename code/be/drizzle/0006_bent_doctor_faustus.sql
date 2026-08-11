CREATE TYPE "public"."notification_kind" AS ENUM('EXPENSE', 'SETTLEMENT', 'SOCIAL', 'REMINDER');--> statement-breakpoint
CREATE TYPE "public"."notification_push_status" AS ENUM('PENDING', 'TICKETED', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TABLE "notification_push_deliveries" (
	"notification_id" uuid NOT NULL,
	"device_token_id" uuid NOT NULL,
	"status" "notification_push_status" DEFAULT 'PENDING' NOT NULL,
	"provider_ticket_id" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"receipt_checked_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_push_deliveries_pk" PRIMARY KEY("notification_id","device_token_id"),
	CONSTRAINT "notification_push_deliveries_attempts_check" CHECK ("notification_push_deliveries"."attempt_count" >= 0),
	CONSTRAINT "notification_push_deliveries_ticket_shape_check" CHECK (("notification_push_deliveries"."status" IN ('TICKETED', 'DELIVERED') AND "notification_push_deliveries"."provider_ticket_id" IS NOT NULL)
        OR "notification_push_deliveries"."status" IN ('PENDING', 'FAILED'))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_outbox_event_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"ledger_id" uuid,
	"kind" "notification_kind" NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_distinct_actor_recipient_check" CHECK ("notifications"."actor_user_id" IS NULL OR "notifications"."actor_user_id" <> "notifications"."recipient_user_id")
);
--> statement-breakpoint
CREATE TABLE "reminder_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"currency" char(3) NOT NULL,
	"owed_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminder_requests_distinct_users_check" CHECK ("reminder_requests"."requester_user_id" <> "reminder_requests"."recipient_user_id"),
	CONSTRAINT "reminder_requests_positive_owed_check" CHECK ("reminder_requests"."owed_minor" > 0),
	CONSTRAINT "reminder_requests_currency_check" CHECK ("reminder_requests"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'))
);
--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "social_activity_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_push_deliveries" ADD CONSTRAINT "notification_push_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_push_deliveries" ADD CONSTRAINT "notification_push_deliveries_device_token_id_device_tokens_id_fk" FOREIGN KEY ("device_token_id") REFERENCES "public"."device_tokens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_source_outbox_event_id_outbox_events_id_fk" FOREIGN KEY ("source_outbox_event_id") REFERENCES "public"."outbox_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_requests" ADD CONSTRAINT "reminder_requests_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_requests" ADD CONSTRAINT "reminder_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_requests" ADD CONSTRAINT "reminder_requests_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "notification_push_deliveries_ticket_uq" ON "notification_push_deliveries" USING btree ("provider_ticket_id") WHERE "notification_push_deliveries"."provider_ticket_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "notification_push_deliveries_retry_idx" ON "notification_push_deliveries" USING btree ("next_attempt_at","notification_id","device_token_id") WHERE "notification_push_deliveries"."status" IN ('PENDING', 'FAILED');--> statement-breakpoint
CREATE INDEX "notification_push_deliveries_receipt_idx" ON "notification_push_deliveries" USING btree ("status","receipt_checked_at","notification_id") WHERE "notification_push_deliveries"."status" = 'TICKETED';--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_recipient_uq" ON "notifications" USING btree ("source_outbox_event_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "notifications"."read_at" IS NULL;--> statement-breakpoint
CREATE INDEX "reminder_requests_cooldown_idx" ON "reminder_requests" USING btree ("ledger_id","requester_user_id","recipient_user_id","currency","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_events_created_idx" ON "activity_events" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE TRIGGER activity_events_append_only
BEFORE UPDATE OR DELETE ON activity_events
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint
CREATE TRIGGER reminder_requests_append_only
BEFORE UPDATE OR DELETE ON reminder_requests
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
