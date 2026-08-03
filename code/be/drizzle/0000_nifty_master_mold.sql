CREATE EXTENSION IF NOT EXISTS "citext";--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('INCOME', 'EXPENSE', 'BOTH');--> statement-breakpoint
CREATE TYPE "public"."connection_request_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."device_platform" AS ENUM('IOS', 'ANDROID');--> statement-breakpoint
CREATE TYPE "public"."event_allocation_role" AS ENUM('PAYER', 'PARTICIPANT');--> statement-breakpoint
CREATE TYPE "public"."expense_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."financial_event_type" AS ENUM('CREATED', 'REPLACEMENT', 'REVERSAL');--> statement-breakpoint
CREATE TYPE "public"."idempotency_status" AS ENUM('PROCESSING', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."identity_provider" AS ENUM('PASSWORD', 'GOOGLE', 'APPLE');--> statement-breakpoint
CREATE TYPE "public"."ledger_member_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
CREATE TYPE "public"."ledger_member_status" AS ENUM('INVITED', 'ACTIVE', 'LEFT', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."ledger_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('DIRECT', 'GROUP');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."personal_report_mode" AS ENUM('OWED_SHARE', 'CASH_OUT_OF_POCKET');--> statement-breakpoint
CREATE TYPE "public"."personal_transaction_status" AS ENUM('ACTIVE', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."personal_transaction_type" AS ENUM('INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."split_method" AS ENUM('EQUAL', 'EXACT');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'DEACTIVATED', 'ANONYMIZED');--> statement-breakpoint
CREATE TABLE "activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"ledger_id" uuid,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"expense_id" uuid,
	"personal_transaction_id" uuid,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attachments_one_parent_check" CHECK (num_nonnulls("attachments"."expense_id", "attachments"."personal_transaction_id") = 1),
	CONSTRAINT "attachments_nonnegative_size_check" CHECK ("attachments"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "balance_projections" (
	"ledger_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" char(3) NOT NULL,
	"net_minor" bigint DEFAULT 0 NOT NULL,
	"last_financial_event_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_projections_pk" PRIMARY KEY("ledger_id","user_id","currency"),
	CONSTRAINT "balance_projections_currency_check" CHECK ("balance_projections"."currency"::text ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"icon_key" text NOT NULL,
	"color_key" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_system_owner_check" CHECK (("categories"."owner_user_id" IS NULL) = "categories"."is_system")
);
--> statement-breakpoint
CREATE TABLE "connection_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"receiver_user_id" uuid NOT NULL,
	"pair_low_user_id" uuid GENERATED ALWAYS AS (least("sender_user_id", "receiver_user_id")) STORED NOT NULL,
	"pair_high_user_id" uuid GENERATED ALWAYS AS (greatest("sender_user_id", "receiver_user_id")) STORED NOT NULL,
	"status" "connection_request_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "connection_requests_distinct_users_check" CHECK ("connection_requests"."sender_user_id" <> "connection_requests"."receiver_user_id")
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" "device_platform" NOT NULL,
	"device_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"financial_event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "event_allocation_role" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"split_method" "split_method",
	CONSTRAINT "event_allocations_role_shape_check" CHECK (("event_allocations"."role" = 'PAYER'
          AND "event_allocations"."amount_minor" > 0
          AND "event_allocations"."split_method" IS NULL)
        OR ("event_allocations"."role" = 'PARTICIPANT'
          AND "event_allocations"."amount_minor" >= 0
          AND "event_allocations"."split_method" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "expense_payers" (
	"expense_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	CONSTRAINT "expense_payers_pk" PRIMARY KEY("expense_id","user_id"),
	CONSTRAINT "expense_payers_positive_amount_check" CHECK ("expense_payers"."amount_minor" > 0)
);
--> statement-breakpoint
CREATE TABLE "expense_splits" (
	"expense_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"owed_minor" bigint NOT NULL,
	"split_method" "split_method" NOT NULL,
	CONSTRAINT "expense_splits_pk" PRIMARY KEY("expense_id","user_id"),
	CONSTRAINT "expense_splits_nonnegative_owed_check" CHECK ("expense_splits"."owed_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"description" text NOT NULL,
	"total_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category_id" uuid,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" "expense_status" DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expenses_positive_total_check" CHECK ("expenses"."total_minor" > 0),
	CONSTRAINT "expenses_currency_check" CHECK ("expenses"."currency"::text ~ '^[A-Z]{3}$'),
	CONSTRAINT "expenses_version_check" CHECK ("expenses"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "financial_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"expense_id" uuid,
	"payment_id" uuid,
	"event_type" "financial_event_type" NOT NULL,
	"reverses_event_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_events_one_source_check" CHECK (num_nonnulls("financial_events"."expense_id", "financial_events"."payment_id") = 1),
	CONSTRAINT "financial_events_reversal_shape_check" CHECK (("financial_events"."event_type" = 'REVERSAL') = ("financial_events"."reverses_event_id" IS NOT NULL)),
	CONSTRAINT "financial_events_no_self_reversal_check" CHECK ("financial_events"."reverses_event_id" IS NULL OR "financial_events"."reverses_event_id" <> "financial_events"."id")
);
--> statement-breakpoint
CREATE TABLE "group_profiles" (
	"ledger_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"group_type" text,
	"image_object_key" text,
	"simplify_debts" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"actor_fingerprint" text NOT NULL,
	"route_scope" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"status" "idempotency_status" DEFAULT 'PROCESSING' NOT NULL,
	"lock_token" uuid,
	"locked_until" timestamp with time zone,
	"response_status" integer,
	"response_body" jsonb,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "idempotency_keys_state_shape_check" CHECK (("idempotency_keys"."status" = 'PROCESSING'
          AND "idempotency_keys"."lock_token" IS NOT NULL
          AND "idempotency_keys"."locked_until" IS NOT NULL
          AND "idempotency_keys"."response_status" IS NULL)
        OR ("idempotency_keys"."status" = 'COMPLETED'
          AND "idempotency_keys"."lock_token" IS NULL
          AND "idempotency_keys"."locked_until" IS NULL
          AND "idempotency_keys"."response_status" BETWEEN 100 AND 599)),
	CONSTRAINT "idempotency_keys_expiry_check" CHECK ("idempotency_keys"."expires_at" > "idempotency_keys"."created_at")
);
--> statement-breakpoint
CREATE TABLE "ledger_members" (
	"ledger_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "ledger_member_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "ledger_member_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_members_pk" PRIMARY KEY("ledger_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ledger_postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"financial_event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	CONSTRAINT "ledger_postings_currency_check" CHECK ("ledger_postings"."currency"::text ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "ledger_type" NOT NULL,
	"status" "ledger_status" DEFAULT 'ACTIVE' NOT NULL,
	"direct_low_user_id" uuid,
	"direct_high_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledgers_direct_shape_check" CHECK (("ledgers"."type" = 'DIRECT'
          AND "ledgers"."direct_low_user_id" IS NOT NULL
          AND "ledgers"."direct_high_user_id" IS NOT NULL
          AND "ledgers"."direct_low_user_id" < "ledgers"."direct_high_user_id")
        OR ("ledgers"."type" = 'GROUP'
          AND "ledgers"."direct_low_user_id" IS NULL
          AND "ledgers"."direct_high_user_id" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"expense_activity_enabled" boolean DEFAULT true NOT NULL,
	"payment_activity_enabled" boolean DEFAULT true NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"claim_token" uuid,
	"claimed_by" text,
	"lease_expires_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"dead_lettered_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_events_attempts_check" CHECK ("outbox_events"."attempt_count" >= 0 AND "outbox_events"."max_attempts" > 0),
	CONSTRAINT "outbox_events_claim_shape_check" CHECK (num_nonnulls("outbox_events"."claim_token", "outbox_events"."claimed_by", "outbox_events"."lease_expires_at") IN (0, 3)),
	CONSTRAINT "outbox_events_terminal_state_check" CHECK (num_nonnulls("outbox_events"."processed_at", "outbox_events"."dead_lettered_at") <= 1)
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"requested_ip" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_expiry_check" CHECK ("password_reset_tokens"."expires_at" > "password_reset_tokens"."created_at")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ledger_id" uuid NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"status" "payment_status" DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_distinct_parties_check" CHECK ("payments"."from_user_id" <> "payments"."to_user_id"),
	CONSTRAINT "payments_positive_amount_check" CHECK ("payments"."amount_minor" > 0),
	CONSTRAINT "payments_currency_check" CHECK ("payments"."currency"::text ~ '^[A-Z]{3}$'),
	CONSTRAINT "payments_version_check" CHECK ("payments"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "personal_ledgers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "personal_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"personal_ledger_id" uuid NOT NULL,
	"type" "personal_transaction_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category_id" uuid NOT NULL,
	"description" text NOT NULL,
	"merchant_or_source" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"notes" text,
	"status" "personal_transaction_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_transactions_positive_amount_check" CHECK ("personal_transactions"."amount_minor" > 0),
	CONSTRAINT "personal_transactions_currency_check" CHECK ("personal_transactions"."currency"::text ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "refresh_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"family_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"rotated_from_session_id" uuid,
	"device_id" text,
	"device_name" text,
	"device_platform" "device_platform",
	"user_agent" text,
	"ip_address" "inet",
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_sessions_expiry_check" CHECK ("refresh_sessions"."expires_at" > "refresh_sessions"."created_at")
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_pk" PRIMARY KEY("blocker_user_id","blocked_user_id"),
	CONSTRAINT "user_blocks_distinct_users_check" CHECK ("user_blocks"."blocker_user_id" <> "user_blocks"."blocked_user_id")
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "identity_provider" NOT NULL,
	"provider_subject" text NOT NULL,
	"password_hash" text,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_password_shape_check" CHECK (("user_identities"."provider" = 'PASSWORD' AND "user_identities"."password_hash" IS NOT NULL)
        OR ("user_identities"."provider" <> 'PASSWORD' AND "user_identities"."password_hash" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"personal_report_mode" "personal_report_mode" DEFAULT 'OWED_SHARE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext",
	"display_name" text NOT NULL,
	"default_currency" char(3) NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_default_currency_check" CHECK ("users"."default_currency"::text ~ '^[A-Z]{3}$'),
	CONSTRAINT "users_email_lifecycle_check" CHECK ("users"."status" = 'ANONYMIZED' OR "users"."email" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_personal_transaction_id_personal_transactions_id_fk" FOREIGN KEY ("personal_transaction_id") REFERENCES "public"."personal_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_projections" ADD CONSTRAINT "balance_projections_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_projections" ADD CONSTRAINT "balance_projections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_projections" ADD CONSTRAINT "balance_projections_last_financial_event_id_financial_events_id_fk" FOREIGN KEY ("last_financial_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connection_requests" ADD CONSTRAINT "connection_requests_receiver_user_id_users_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_allocations" ADD CONSTRAINT "event_allocations_financial_event_id_financial_events_id_fk" FOREIGN KEY ("financial_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_allocations" ADD CONSTRAINT "event_allocations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_payers" ADD CONSTRAINT "expense_payers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_reverses_event_id_financial_events_id_fk" FOREIGN KEY ("reverses_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_profiles" ADD CONSTRAINT "group_profiles_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_members" ADD CONSTRAINT "ledger_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_financial_event_id_financial_events_id_fk" FOREIGN KEY ("financial_event_id") REFERENCES "public"."financial_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_direct_low_user_id_users_id_fk" FOREIGN KEY ("direct_low_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledgers" ADD CONSTRAINT "ledgers_direct_high_user_id_users_id_fk" FOREIGN KEY ("direct_high_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_ledger_id_ledgers_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_ledgers" ADD CONSTRAINT "personal_ledgers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_personal_ledger_id_personal_ledgers_id_fk" FOREIGN KEY ("personal_ledger_id") REFERENCES "public"."personal_ledgers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_rotated_from_session_id_refresh_sessions_id_fk" FOREIGN KEY ("rotated_from_session_id") REFERENCES "public"."refresh_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_events_ledger_created_idx" ON "activity_events" USING btree ("ledger_id","created_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE INDEX "activity_events_actor_created_idx" ON "activity_events" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "attachments_object_key_uq" ON "attachments" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "attachments_expense_idx" ON "attachments" USING btree ("expense_id") WHERE "attachments"."expense_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "attachments_personal_transaction_idx" ON "attachments" USING btree ("personal_transaction_id") WHERE "attachments"."personal_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_owned_name_kind_uq" ON "categories" USING btree ("owner_user_id","name","kind") WHERE "categories"."owner_user_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_name_kind_uq" ON "categories" USING btree ("name","kind") WHERE "categories"."owner_user_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "connection_requests_pending_pair_uq" ON "connection_requests" USING btree ("pair_low_user_id","pair_high_user_id") WHERE "connection_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "connection_requests_sender_status_idx" ON "connection_requests" USING btree ("sender_user_id","status");--> statement-breakpoint
CREATE INDEX "connection_requests_receiver_status_idx" ON "connection_requests" USING btree ("receiver_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_uq" ON "device_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "device_tokens_user_enabled_idx" ON "device_tokens" USING btree ("user_id","enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "event_allocations_event_user_role_uq" ON "event_allocations" USING btree ("financial_event_id","user_id","role");--> statement-breakpoint
CREATE INDEX "expenses_ledger_active_occurred_idx" ON "expenses" USING btree ("ledger_id","occurred_at" DESC NULLS LAST,"id") WHERE "expenses"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_reverses_event_uq" ON "financial_events" USING btree ("reverses_event_id") WHERE "financial_events"."reverses_event_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_expense_created_uq" ON "financial_events" USING btree ("expense_id") WHERE "financial_events"."expense_id" IS NOT NULL AND "financial_events"."event_type" = 'CREATED';--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_payment_created_uq" ON "financial_events" USING btree ("payment_id") WHERE "financial_events"."payment_id" IS NOT NULL AND "financial_events"."event_type" = 'CREATED';--> statement-breakpoint
CREATE INDEX "financial_events_ledger_order_idx" ON "financial_events" USING btree ("ledger_id","created_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_actor_scope_key_uq" ON "idempotency_keys" USING btree ("actor_fingerprint","route_scope","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_scope_key_uq" ON "idempotency_keys" USING btree ("user_id","route_scope","idempotency_key") WHERE "idempotency_keys"."user_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idempotency_keys_expiry_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ledger_members_user_status_idx" ON "ledger_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ledger_members_ledger_status_idx" ON "ledger_members" USING btree ("ledger_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_postings_event_user_uq" ON "ledger_postings" USING btree ("financial_event_id","user_id");--> statement-breakpoint
CREATE INDEX "ledger_postings_user_idx" ON "ledger_postings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledgers_direct_pair_uq" ON "ledgers" USING btree ("direct_low_user_id","direct_high_user_id") WHERE "ledgers"."type" = 'DIRECT';--> statement-breakpoint
CREATE INDEX "outbox_events_pending_idx" ON "outbox_events" USING btree ("available_at","lease_expires_at","id") WHERE "outbox_events"."processed_at" IS NULL AND "outbox_events"."dead_lettered_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_uq" ON "password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_created_idx" ON "password_reset_tokens" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payments_ledger_occurred_idx" ON "payments" USING btree ("ledger_id","occurred_at" DESC NULLS LAST,"id");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_ledgers_user_uq" ON "personal_ledgers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "personal_transactions_ledger_active_occurred_idx" ON "personal_transactions" USING btree ("personal_ledger_id","occurred_at" DESC NULLS LAST,"id") WHERE "personal_transactions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_sessions_token_hash_uq" ON "refresh_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_sessions_rotated_from_uq" ON "refresh_sessions" USING btree ("rotated_from_session_id");--> statement-breakpoint
CREATE INDEX "refresh_sessions_user_idx" ON "refresh_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_sessions_family_idx" ON "refresh_sessions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "user_blocks_blocked_user_idx" ON "user_blocks" USING btree ("blocked_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_provider_subject_uq" ON "user_identities" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "user_identities_user_provider_uq" ON "user_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_ledger_shape(target_ledger_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  ledger_record ledgers%ROWTYPE;
  member_count integer;
  invalid_member_count integer;
  profile_count integer;
BEGIN
  SELECT * INTO ledger_record FROM ledgers WHERE id = target_ledger_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*) INTO member_count
  FROM ledger_members
  WHERE ledger_id = target_ledger_id;

  SELECT count(*) INTO profile_count
  FROM group_profiles
  WHERE ledger_id = target_ledger_id;

  IF ledger_record.type = 'DIRECT' THEN
    SELECT count(*) INTO invalid_member_count
    FROM ledger_members
    WHERE ledger_id = target_ledger_id
      AND user_id NOT IN (
        ledger_record.direct_low_user_id,
        ledger_record.direct_high_user_id
      );

    IF member_count <> 2 OR invalid_member_count <> 0 THEN
      RAISE EXCEPTION
        'DIRECT ledger % must contain exactly its two canonical parties',
        target_ledger_id
        USING ERRCODE = '23514';
    END IF;

    IF profile_count <> 0 THEN
      RAISE EXCEPTION 'DIRECT ledger % cannot have a group profile', target_ledger_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF ledger_record.type = 'GROUP' AND profile_count <> 1 THEN
    RAISE EXCEPTION 'GROUP ledger % must have exactly one group profile', target_ledger_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_ledger_shape()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_ledger_id uuid;
  new_ledger_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'ledgers' THEN
    IF TG_OP <> 'INSERT' THEN old_ledger_id := OLD.id; END IF;
    IF TG_OP <> 'DELETE' THEN new_ledger_id := NEW.id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN old_ledger_id := OLD.ledger_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_ledger_id := NEW.ledger_id; END IF;
  END IF;

  IF old_ledger_id IS NOT NULL THEN
    PERFORM assert_ledger_shape(old_ledger_id);
  END IF;
  IF new_ledger_id IS NOT NULL AND new_ledger_id IS DISTINCT FROM old_ledger_id THEN
    PERFORM assert_ledger_shape(new_ledger_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER ledgers_shape_check
AFTER INSERT OR UPDATE ON ledgers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_shape();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER ledger_members_shape_check
AFTER INSERT OR UPDATE OR DELETE ON ledger_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_shape();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER group_profiles_shape_check
AFTER INSERT OR UPDATE OR DELETE ON group_profiles
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_ledger_shape();--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_expense_allocations(target_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  expense_total bigint;
  payer_total numeric;
  split_total numeric;
  payer_count integer;
  split_count integer;
BEGIN
  SELECT total_minor INTO expense_total
  FROM expenses
  WHERE id = target_expense_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT count(*), coalesce(sum(amount_minor), 0)
  INTO payer_count, payer_total
  FROM expense_payers
  WHERE expense_id = target_expense_id;

  SELECT count(*), coalesce(sum(owed_minor), 0)
  INTO split_count, split_total
  FROM expense_splits
  WHERE expense_id = target_expense_id;

  IF payer_count = 0 OR payer_total <> expense_total THEN
    RAISE EXCEPTION 'Expense % payer allocation must equal total', target_expense_id
      USING ERRCODE = '23514';
  END IF;
  IF split_count = 0 OR split_total <> expense_total THEN
    RAISE EXCEPTION 'Expense % split allocation must equal total', target_expense_id
      USING ERRCODE = '23514';
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_expense_allocations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_expense_id uuid;
  new_expense_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'expenses' THEN
    IF TG_OP <> 'INSERT' THEN old_expense_id := OLD.id; END IF;
    IF TG_OP <> 'DELETE' THEN new_expense_id := NEW.id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN old_expense_id := OLD.expense_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_expense_id := NEW.expense_id; END IF;
  END IF;

  IF old_expense_id IS NOT NULL THEN
    PERFORM assert_expense_allocations(old_expense_id);
  END IF;
  IF new_expense_id IS NOT NULL AND new_expense_id IS DISTINCT FROM old_expense_id THEN
    PERFORM assert_expense_allocations(new_expense_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER expenses_allocations_check
AFTER INSERT OR UPDATE ON expenses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_expense_allocations();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER expense_payers_total_check
AFTER INSERT OR UPDATE OR DELETE ON expense_payers
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_expense_allocations();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER expense_splits_total_check
AFTER INSERT OR UPDATE OR DELETE ON expense_splits
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_expense_allocations();--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_financial_event(target_event_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  event_record financial_events%ROWTYPE;
  source_ledger_id uuid;
  source_currency char(3);
  posting_count integer;
  invalid_posting_count integer;
  unbalanced_currency_count integer;
  allocation_count integer;
  source_total bigint;
  payer_total numeric;
  participant_total numeric;
  reversed_event financial_events%ROWTYPE;
  reversal_mismatch_count integer;
BEGIN
  SELECT * INTO event_record FROM financial_events WHERE id = target_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF event_record.expense_id IS NOT NULL THEN
    SELECT ledger_id, currency, total_minor
    INTO source_ledger_id, source_currency, source_total
    FROM expenses WHERE id = event_record.expense_id;
  ELSE
    SELECT ledger_id, currency, amount_minor
    INTO source_ledger_id, source_currency, source_total
    FROM payments WHERE id = event_record.payment_id;
  END IF;

  IF source_ledger_id IS DISTINCT FROM event_record.ledger_id THEN
    RAISE EXCEPTION 'Financial event % must use its source ledger', target_event_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO posting_count
  FROM ledger_postings WHERE financial_event_id = target_event_id;

  SELECT count(*) INTO invalid_posting_count
  FROM ledger_postings posting
  WHERE posting.financial_event_id = target_event_id
    AND (
      posting.currency <> source_currency
      OR NOT EXISTS (
        SELECT 1 FROM ledger_members member
        WHERE member.ledger_id = event_record.ledger_id
          AND member.user_id = posting.user_id
      )
    );

  SELECT count(*) INTO unbalanced_currency_count
  FROM (
    SELECT currency
    FROM ledger_postings
    WHERE financial_event_id = target_event_id
    GROUP BY currency
    HAVING sum(amount_minor) <> 0
  ) unbalanced;

  IF posting_count = 0 OR invalid_posting_count <> 0 OR unbalanced_currency_count <> 0 THEN
    RAISE EXCEPTION 'Financial event % has invalid or unbalanced postings', target_event_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO allocation_count
  FROM event_allocations WHERE financial_event_id = target_event_id;

  IF event_record.expense_id IS NULL AND allocation_count <> 0 THEN
    RAISE EXCEPTION 'Payment event % cannot contain expense allocations', target_event_id
      USING ERRCODE = '23514';
  ELSIF event_record.expense_id IS NOT NULL THEN
    SELECT coalesce(sum(amount_minor), 0) INTO payer_total
    FROM event_allocations
    WHERE financial_event_id = target_event_id AND role = 'PAYER';

    SELECT coalesce(sum(amount_minor), 0) INTO participant_total
    FROM event_allocations
    WHERE financial_event_id = target_event_id AND role = 'PARTICIPANT';

    IF payer_total <> source_total OR participant_total <> source_total THEN
      RAISE EXCEPTION 'Expense event % allocation snapshot must equal source total', target_event_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF event_record.event_type = 'REVERSAL' THEN
    SELECT * INTO reversed_event
    FROM financial_events
    WHERE id = event_record.reverses_event_id;

    IF NOT FOUND
      OR reversed_event.ledger_id <> event_record.ledger_id
      OR reversed_event.expense_id IS DISTINCT FROM event_record.expense_id
      OR reversed_event.payment_id IS DISTINCT FROM event_record.payment_id
    THEN
      RAISE EXCEPTION 'Reversal event % must reference the same source and ledger', target_event_id
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO reversal_mismatch_count
    FROM (
      SELECT coalesce(original.user_id, reversal.user_id) AS user_id,
             coalesce(original.currency, reversal.currency) AS currency,
             coalesce(original.amount_minor, 0) + coalesce(reversal.amount_minor, 0) AS net_minor
      FROM (
        SELECT user_id, currency, amount_minor
        FROM ledger_postings
        WHERE financial_event_id = event_record.reverses_event_id
      ) original
      FULL JOIN (
        SELECT user_id, currency, amount_minor
        FROM ledger_postings
        WHERE financial_event_id = target_event_id
      ) reversal
        ON original.user_id = reversal.user_id
       AND original.currency = reversal.currency
    ) compared
    WHERE net_minor <> 0;

    IF reversal_mismatch_count <> 0 THEN
      RAISE EXCEPTION 'Reversal event % must exactly negate its referenced event', target_event_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_financial_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  old_event_id uuid;
  new_event_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'financial_events' THEN
    IF TG_OP <> 'INSERT' THEN old_event_id := OLD.id; END IF;
    IF TG_OP <> 'DELETE' THEN new_event_id := NEW.id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN old_event_id := OLD.financial_event_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_event_id := NEW.financial_event_id; END IF;
  END IF;

  IF old_event_id IS NOT NULL THEN
    PERFORM assert_financial_event(old_event_id);
  END IF;
  IF new_event_id IS NOT NULL AND new_event_id IS DISTINCT FROM old_event_id THEN
    PERFORM assert_financial_event(new_event_id);
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER financial_events_integrity_check
AFTER INSERT ON financial_events
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_financial_event();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER event_allocations_integrity_check
AFTER INSERT ON event_allocations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_financial_event();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER ledger_postings_integrity_check
AFTER INSERT ON ledger_postings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_financial_event();--> statement-breakpoint

CREATE OR REPLACE FUNCTION reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = '55000';
END;
$$;--> statement-breakpoint

CREATE TRIGGER financial_events_append_only
BEFORE UPDATE OR DELETE ON financial_events
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER event_allocations_append_only
BEFORE UPDATE OR DELETE ON event_allocations
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER ledger_postings_append_only
BEFORE UPDATE OR DELETE ON ledger_postings
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();
