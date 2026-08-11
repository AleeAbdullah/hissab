DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM personal_transactions) THEN
    RAISE EXCEPTION 'Cannot add immutable personal transaction history to existing personal transaction data';
  END IF;
END;
$$;--> statement-breakpoint

INSERT INTO personal_ledgers (user_id)
SELECT id
FROM users
ON CONFLICT (user_id) DO NOTHING;--> statement-breakpoint

INSERT INTO categories (
  owner_user_id,
  code,
  name,
  kind,
  icon_key,
  color_key,
  is_system
)
VALUES
  (NULL, 'SALARY', 'Salary', 'INCOME', 'salary', 'green', true),
  (NULL, 'FREELANCE', 'Freelance', 'INCOME', 'freelance', 'green', true),
  (NULL, 'BUSINESS', 'Business', 'INCOME', 'business', 'green', true),
  (NULL, 'GIFTS', 'Gifts', 'INCOME', 'gifts', 'green', true),
  (NULL, 'REFUNDS', 'Refunds', 'INCOME', 'refunds', 'green', true),
  (NULL, 'OTHER_INCOME', 'Other Income', 'INCOME', 'other-income', 'green', true);--> statement-breakpoint

DROP INDEX "personal_transactions_ledger_active_occurred_idx";--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD COLUMN "root_personal_transaction_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD COLUMN "replaces_personal_transaction_id" uuid;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_root_personal_transaction_id_personal_transactions_id_fk" FOREIGN KEY ("root_personal_transaction_id") REFERENCES "public"."personal_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_replaces_personal_transaction_id_personal_transactions_id_fk" FOREIGN KEY ("replaces_personal_transaction_id") REFERENCES "public"."personal_transactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "personal_transactions_root_version_uq" ON "personal_transactions" USING btree ("root_personal_transaction_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "personal_transactions_replaces_uq" ON "personal_transactions" USING btree ("replaces_personal_transaction_id") WHERE "personal_transactions"."replaces_personal_transaction_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "personal_transactions_ledger_root_version_idx" ON "personal_transactions" USING btree ("personal_ledger_id","root_personal_transaction_id","version" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "personal_transactions_ledger_active_occurred_idx" ON "personal_transactions" USING btree ("personal_ledger_id","occurred_at" DESC NULLS LAST,"id" DESC NULLS LAST) WHERE "personal_transactions"."status" = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_description_length_check" CHECK (char_length(btrim("personal_transactions"."description")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_merchant_length_check" CHECK ("personal_transactions"."merchant_or_source" IS NULL OR char_length(btrim("personal_transactions"."merchant_or_source")) BETWEEN 1 AND 200);--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_notes_length_check" CHECK ("personal_transactions"."notes" IS NULL OR char_length(btrim("personal_transactions"."notes")) BETWEEN 1 AND 2000);--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_version_check" CHECK ("personal_transactions"."version" >= 1);--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_personal_transaction_revision(target_personal_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  transaction_record personal_transactions%ROWTYPE;
  previous_record personal_transactions%ROWTYPE;
BEGIN
  SELECT * INTO transaction_record
  FROM personal_transactions
  WHERE id = target_personal_transaction_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM categories category
    WHERE category.id = transaction_record.category_id
      AND category.is_system
      AND category.kind::text = transaction_record.type::text
      AND (
        (transaction_record.type = 'EXPENSE' AND category.code IN (
          'FOOD_AND_DRINK',
          'GROCERIES',
          'TRANSPORT',
          'ACCOMMODATION',
          'UTILITIES',
          'ENTERTAINMENT',
          'SHOPPING',
          'HEALTHCARE',
          'OTHER'
        ))
        OR (transaction_record.type = 'INCOME' AND category.code IN (
          'SALARY',
          'FREELANCE',
          'BUSINESS',
          'GIFTS',
          'REFUNDS',
          'OTHER_INCOME'
        ))
      )
  ) THEN
    RAISE EXCEPTION 'Personal transaction % requires an approved system category compatible with its type', target_personal_transaction_id
      USING ERRCODE = '23514';
  END IF;

  IF transaction_record.version = 1 THEN
    IF transaction_record.root_personal_transaction_id <> transaction_record.id
      OR transaction_record.replaces_personal_transaction_id IS NOT NULL
      OR transaction_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Personal transaction % has an invalid root revision', target_personal_transaction_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF transaction_record.root_personal_transaction_id = transaction_record.id
      OR transaction_record.replaces_personal_transaction_id IS NULL
    THEN
      RAISE EXCEPTION 'Personal transaction % has an invalid replacement shape', target_personal_transaction_id
        USING ERRCODE = '23514';
    END IF;

    SELECT * INTO previous_record
    FROM personal_transactions
    WHERE id = transaction_record.replaces_personal_transaction_id;

    IF NOT FOUND
      OR previous_record.root_personal_transaction_id <> transaction_record.root_personal_transaction_id
      OR previous_record.version + 1 <> transaction_record.version
      OR previous_record.personal_ledger_id <> transaction_record.personal_ledger_id
      OR previous_record.currency <> transaction_record.currency
      OR previous_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Personal transaction % does not continue its immutable revision chain', target_personal_transaction_id
        USING ERRCODE = '23514';
    END IF;

    IF transaction_record.status = 'DELETED'
      AND (
        transaction_record.type IS DISTINCT FROM previous_record.type
        OR transaction_record.amount_minor IS DISTINCT FROM previous_record.amount_minor
        OR transaction_record.category_id IS DISTINCT FROM previous_record.category_id
        OR transaction_record.description IS DISTINCT FROM previous_record.description
        OR transaction_record.merchant_or_source IS DISTINCT FROM previous_record.merchant_or_source
        OR transaction_record.occurred_at IS DISTINCT FROM previous_record.occurred_at
        OR transaction_record.notes IS DISTINCT FROM previous_record.notes
      )
    THEN
      RAISE EXCEPTION 'Personal transaction tombstone % must preserve its replaced snapshot', target_personal_transaction_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_personal_transaction_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_personal_transaction_revision(NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER personal_transactions_integrity_check
AFTER INSERT ON personal_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_personal_transaction_revision();--> statement-breakpoint

CREATE TRIGGER personal_transactions_append_only
BEFORE UPDATE OR DELETE ON personal_transactions
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER personal_ledgers_append_only
BEFORE UPDATE OR DELETE ON personal_ledgers
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_user_personal_ledger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT count(*) FROM personal_ledgers WHERE user_id = NEW.id) <> 1 THEN
    RAISE EXCEPTION 'User % requires exactly one personal ledger', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER users_personal_ledger_check
AFTER INSERT ON users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_user_personal_ledger();
