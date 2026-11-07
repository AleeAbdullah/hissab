CREATE TABLE "user_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"reported_user_id" uuid,
	"group_ledger_id" uuid,
	"reason" text NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_reports_single_target_check" CHECK (("user_reports"."reported_user_id" IS NULL) <> ("user_reports"."group_ledger_id" IS NULL)),
	CONSTRAINT "user_reports_not_self_check" CHECK ("user_reports"."reported_user_id" IS NULL OR "user_reports"."reported_user_id" <> "user_reports"."reporter_user_id"),
	CONSTRAINT "user_reports_reason_check" CHECK ("user_reports"."reason" IN ('HARASSMENT', 'SPAM_OR_SCAM', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER')),
	CONSTRAINT "user_reports_details_length_check" CHECK ("user_reports"."details" IS NULL OR char_length("user_reports"."details") BETWEEN 1 AND 1000)
);--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_reported_user_id_users_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_reports" ADD CONSTRAINT "user_reports_group_ledger_id_ledgers_id_fk" FOREIGN KEY ("group_ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_reports_reporter_idx" ON "user_reports" USING btree ("reporter_user_id");
