DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM payments) THEN
    RAISE EXCEPTION 'Cannot add immutable settlement history to existing payment data';
  END IF;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS ledger_postings_projection ON ledger_postings;--> statement-breakpoint
DROP FUNCTION IF EXISTS project_ledger_posting();--> statement-breakpoint
ALTER TABLE "balance_projections" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "balance_projections" CASCADE;--> statement-breakpoint
DROP INDEX "financial_events_payment_created_uq";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "root_payment_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "replaces_payment_id" uuid;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "created_by_user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_root_payment_id_payments_id_fk" FOREIGN KEY ("root_payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_replaces_payment_id_payments_id_fk" FOREIGN KEY ("replaces_payment_id") REFERENCES "public"."payments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_payment_effect_uq" ON "financial_events" USING btree ("payment_id") WHERE "financial_events"."payment_id" IS NOT NULL AND "financial_events"."event_type" <> 'REVERSAL';--> statement-breakpoint
CREATE UNIQUE INDEX "payments_root_version_uq" ON "payments" USING btree ("root_payment_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_replaces_payment_uq" ON "payments" USING btree ("replaces_payment_id") WHERE "payments"."replaces_payment_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "payments_ledger_root_version_idx" ON "payments" USING btree ("ledger_id","root_payment_id","version" DESC NULLS LAST);--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_payment_revision(target_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  payment_record payments%ROWTYPE;
  previous_record payments%ROWTYPE;
  effect_count integer;
  effect_type financial_event_type;
  previous_effect_id uuid;
  reversal_count integer;
BEGIN
  SELECT * INTO payment_record
  FROM payments
  WHERE id = target_payment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ledgers ledger
    JOIN ledger_members creator
      ON creator.ledger_id = ledger.id
     AND creator.user_id = payment_record.created_by_user_id
     AND creator.status = 'ACTIVE'
    WHERE ledger.id = payment_record.ledger_id
      AND ledger.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Settlement % requires an active ledger creator', target_payment_id
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ledger_members member
    WHERE member.ledger_id = payment_record.ledger_id
      AND member.user_id = payment_record.from_user_id
      AND member.status = 'ACTIVE'
  ) OR NOT EXISTS (
    SELECT 1
    FROM ledger_members member
    WHERE member.ledger_id = payment_record.ledger_id
      AND member.user_id = payment_record.to_user_id
      AND member.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Settlement % parties must be active ledger members', target_payment_id
      USING ERRCODE = '23514';
  END IF;

  IF payment_record.version = 1 THEN
    IF payment_record.root_payment_id <> payment_record.id
      OR payment_record.replaces_payment_id IS NOT NULL
      OR payment_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Settlement % has an invalid root revision', target_payment_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF payment_record.root_payment_id = payment_record.id
      OR payment_record.replaces_payment_id IS NULL
    THEN
      RAISE EXCEPTION 'Settlement % has an invalid replacement shape', target_payment_id
        USING ERRCODE = '23514';
    END IF;

    SELECT * INTO previous_record
    FROM payments
    WHERE id = payment_record.replaces_payment_id;

    IF NOT FOUND
      OR previous_record.root_payment_id <> payment_record.root_payment_id
      OR previous_record.version + 1 <> payment_record.version
      OR previous_record.ledger_id <> payment_record.ledger_id
      OR previous_record.currency <> payment_record.currency
      OR previous_record.created_by_user_id <> payment_record.created_by_user_id
      OR previous_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Settlement % does not continue its immutable revision chain', target_payment_id
        USING ERRCODE = '23514';
    END IF;

    IF payment_record.status = 'DELETED'
      AND (
        payment_record.from_user_id IS DISTINCT FROM previous_record.from_user_id
        OR payment_record.to_user_id IS DISTINCT FROM previous_record.to_user_id
        OR payment_record.amount_minor IS DISTINCT FROM previous_record.amount_minor
        OR payment_record.occurred_at IS DISTINCT FROM previous_record.occurred_at
      )
    THEN
      RAISE EXCEPTION 'Settlement tombstone % must preserve its replaced snapshot', target_payment_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT count(*) INTO effect_count
  FROM financial_events
  WHERE payment_id = target_payment_id
    AND event_type <> 'REVERSAL';

  IF payment_record.status = 'ACTIVE' THEN
    IF effect_count <> 1 THEN
      RAISE EXCEPTION 'Active settlement revision % requires one effect event', target_payment_id
        USING ERRCODE = '23514';
    END IF;

    SELECT event_type INTO effect_type
    FROM financial_events
    WHERE payment_id = target_payment_id
      AND event_type <> 'REVERSAL';

    IF (payment_record.version = 1 AND effect_type <> 'CREATED')
      OR (payment_record.version > 1 AND effect_type <> 'REPLACEMENT')
    THEN
      RAISE EXCEPTION 'Settlement revision % has the wrong effect event type', target_payment_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF effect_count <> 0 THEN
    RAISE EXCEPTION 'Settlement tombstone % cannot have an effect event', target_payment_id
      USING ERRCODE = '23514';
  END IF;

  IF payment_record.version > 1 THEN
    SELECT id INTO previous_effect_id
    FROM financial_events
    WHERE payment_id = previous_record.id
      AND event_type <> 'REVERSAL';

    SELECT count(*) INTO reversal_count
    FROM financial_events
    WHERE event_type = 'REVERSAL'
      AND payment_id = previous_record.id
      AND reverses_event_id = previous_effect_id;

    IF previous_effect_id IS NULL OR reversal_count <> 1 THEN
      RAISE EXCEPTION 'Settlement revision % requires a paired reversal', target_payment_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_payment_revision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_payment_revision(NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER payments_integrity_check
AFTER INSERT ON payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_payment_revision();--> statement-breakpoint

CREATE TRIGGER payments_append_only
BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_payment_event(target_event_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  event_record financial_events%ROWTYPE;
  payment_record payments%ROWTYPE;
  reversed_event financial_events%ROWTYPE;
  posting_mismatch_count integer;
BEGIN
  SELECT * INTO event_record
  FROM financial_events
  WHERE id = target_event_id;
  IF NOT FOUND OR event_record.payment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO payment_record
  FROM payments
  WHERE id = event_record.payment_id;

  IF event_record.ledger_id <> payment_record.ledger_id
    OR event_record.created_by_user_id <> payment_record.created_by_user_id
  THEN
    RAISE EXCEPTION 'Settlement event % must use its settlement ledger and creator', target_event_id
      USING ERRCODE = '23514';
  END IF;

  WITH expected AS (
    SELECT payment_record.from_user_id AS user_id,
           CASE WHEN event_record.event_type = 'REVERSAL'
             THEN -payment_record.amount_minor
             ELSE payment_record.amount_minor
           END AS amount_minor
    UNION ALL
    SELECT payment_record.to_user_id,
           CASE WHEN event_record.event_type = 'REVERSAL'
             THEN payment_record.amount_minor
             ELSE -payment_record.amount_minor
           END
  ), actual AS (
    SELECT user_id, amount_minor
    FROM ledger_postings
    WHERE financial_event_id = target_event_id
      AND currency = payment_record.currency
  )
  SELECT count(*) INTO posting_mismatch_count
  FROM (
    (SELECT user_id, amount_minor FROM expected
     EXCEPT
     SELECT user_id, amount_minor FROM actual)
    UNION ALL
    (SELECT user_id, amount_minor FROM actual
     EXCEPT
     SELECT user_id, amount_minor FROM expected)
  ) mismatch;

  IF posting_mismatch_count <> 0 THEN
    RAISE EXCEPTION 'Settlement event % postings must match its payment snapshot', target_event_id
      USING ERRCODE = '23514';
  END IF;

  IF event_record.event_type = 'REVERSAL' THEN
    SELECT * INTO reversed_event
    FROM financial_events
    WHERE id = event_record.reverses_event_id;

    IF NOT FOUND
      OR reversed_event.payment_id IS DISTINCT FROM event_record.payment_id
      OR NOT EXISTS (
        SELECT 1
        FROM payments replacement
        WHERE replacement.replaces_payment_id = reversed_event.payment_id
      )
    THEN
      RAISE EXCEPTION 'Settlement reversal % requires its replacement or tombstone', target_event_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_payment_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_event_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'financial_events' THEN
    target_event_id := NEW.id;
  ELSE
    target_event_id := NEW.financial_event_id;
  END IF;

  PERFORM assert_payment_event(target_event_id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER financial_events_payment_integrity_check
AFTER INSERT ON financial_events
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_payment_event();--> statement-breakpoint

CREATE CONSTRAINT TRIGGER ledger_postings_payment_integrity_check
AFTER INSERT ON ledger_postings
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_payment_event();
