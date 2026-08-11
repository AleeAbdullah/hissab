DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users
    WHERE NOT (
      (status = 'ANONYMIZED'
        AND email IS NULL
        AND display_name = 'Deleted user'
        AND deleted_at IS NOT NULL)
      OR (status <> 'ANONYMIZED'
        AND email IS NOT NULL
        AND deleted_at IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'Cannot strengthen the user lifecycle constraint while incompatible user data exists'
      USING ERRCODE = '23514';
  END IF;
END;
$$;--> statement-breakpoint

ALTER TABLE "users" DROP CONSTRAINT "users_email_lifecycle_check";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_lifecycle_check" CHECK (("users"."status" = 'ANONYMIZED'
          AND "users"."email" IS NULL
          AND "users"."display_name" = 'Deleted user'
          AND "users"."deleted_at" IS NOT NULL)
        OR ("users"."status" <> 'ANONYMIZED'
          AND "users"."email" IS NOT NULL
          AND "users"."deleted_at" IS NULL));--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_active_identity_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE id = NEW.user_id
      AND status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Identity requires an active user'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER user_identities_active_user_check
BEFORE INSERT OR UPDATE ON user_identities
FOR EACH ROW EXECUTE FUNCTION enforce_active_identity_user();--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_expense_active_users(target_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  expense_record expenses%ROWTYPE;
  previous_record expenses%ROWTYPE;
  invalid_user_count integer;
BEGIN
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = target_expense_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM 1
  FROM ledgers
  WHERE id = expense_record.ledger_id
  FOR UPDATE;

  SELECT count(*) INTO invalid_user_count
  FROM (
    SELECT expense_record.created_by_user_id AS user_id
    UNION
    SELECT user_id FROM expense_payers WHERE expense_id = target_expense_id
    UNION
    SELECT user_id FROM expense_splits WHERE expense_id = target_expense_id
  ) involved
  LEFT JOIN users involved_user ON involved_user.id = involved.user_id
  LEFT JOIN ledger_members member
    ON member.ledger_id = expense_record.ledger_id
   AND member.user_id = involved.user_id
  WHERE involved_user.status IS DISTINCT FROM 'ACTIVE'
     OR member.status IS DISTINCT FROM 'ACTIVE';

  IF invalid_user_count <> 0 THEN
    RAISE EXCEPTION 'Expense % requires active users and ledger members', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  IF expense_record.version > 1 THEN
    SELECT * INTO previous_record
    FROM expenses
    WHERE id = expense_record.replaces_expense_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Expense % requires an existing replaced revision', target_expense_id
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO invalid_user_count
    FROM (
      SELECT previous_record.created_by_user_id AS user_id
      UNION
      SELECT user_id FROM expense_payers WHERE expense_id = previous_record.id
      UNION
      SELECT user_id FROM expense_splits WHERE expense_id = previous_record.id
    ) involved
    LEFT JOIN users involved_user ON involved_user.id = involved.user_id
    LEFT JOIN ledger_members member
      ON member.ledger_id = previous_record.ledger_id
     AND member.user_id = involved.user_id
    WHERE involved_user.status IS DISTINCT FROM 'ACTIVE'
       OR member.status IS DISTINCT FROM 'ACTIVE';

    IF invalid_user_count <> 0 THEN
      RAISE EXCEPTION 'Expense % is frozen because its replaced revision involves an inactive user or ledger member', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_expense_active_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_expense_active_users(NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER expenses_active_users_check
AFTER INSERT ON expenses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_expense_active_users();--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_payment_active_users(target_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  payment_record payments%ROWTYPE;
  previous_record payments%ROWTYPE;
  invalid_user_count integer;
BEGIN
  SELECT * INTO payment_record
  FROM payments
  WHERE id = target_payment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM 1
  FROM ledgers
  WHERE id = payment_record.ledger_id
  FOR UPDATE;

  SELECT count(*) INTO invalid_user_count
  FROM (
    SELECT payment_record.created_by_user_id AS user_id
    UNION
    SELECT payment_record.from_user_id
    UNION
    SELECT payment_record.to_user_id
  ) involved
  LEFT JOIN users involved_user ON involved_user.id = involved.user_id
  LEFT JOIN ledger_members member
    ON member.ledger_id = payment_record.ledger_id
   AND member.user_id = involved.user_id
  WHERE involved_user.status IS DISTINCT FROM 'ACTIVE'
     OR member.status IS DISTINCT FROM 'ACTIVE';

  IF invalid_user_count <> 0 THEN
    RAISE EXCEPTION 'Settlement % requires active users and ledger members', target_payment_id
      USING ERRCODE = '23514';
  END IF;

  IF payment_record.version > 1 THEN
    SELECT * INTO previous_record
    FROM payments
    WHERE id = payment_record.replaces_payment_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Settlement % requires an existing replaced revision', target_payment_id
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO invalid_user_count
    FROM (
      SELECT previous_record.created_by_user_id AS user_id
      UNION
      SELECT previous_record.from_user_id
      UNION
      SELECT previous_record.to_user_id
    ) involved
    LEFT JOIN users involved_user ON involved_user.id = involved.user_id
    LEFT JOIN ledger_members member
      ON member.ledger_id = previous_record.ledger_id
     AND member.user_id = involved.user_id
    WHERE involved_user.status IS DISTINCT FROM 'ACTIVE'
       OR member.status IS DISTINCT FROM 'ACTIVE';

    IF invalid_user_count <> 0 THEN
      RAISE EXCEPTION 'Settlement % is frozen because its replaced revision involves an inactive user or ledger member', target_payment_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_payment_active_users()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_payment_active_users(NEW.id);
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER payments_active_users_check
AFTER INSERT ON payments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_payment_active_users();--> statement-breakpoint

CREATE OR REPLACE FUNCTION enforce_personal_transaction_active_owner()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM 1
  FROM personal_ledgers
  WHERE id = NEW.personal_ledger_id
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1
    FROM personal_ledgers ledger
    JOIN users owner ON owner.id = ledger.user_id
    WHERE ledger.id = NEW.personal_ledger_id
      AND owner.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Personal transaction requires an active ledger owner'
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE CONSTRAINT TRIGGER personal_transactions_active_owner_check
AFTER INSERT ON personal_transactions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_personal_transaction_active_owner();--> statement-breakpoint

CREATE OR REPLACE FUNCTION notify_refresh_session_revocation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'hissab_session_revocations',
    json_build_object('userId', NEW.user_id, 'sessionId', NEW.id)::text
  );
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER refresh_sessions_revocation_notify
AFTER UPDATE OF revoked_at, consumed_at ON refresh_sessions
FOR EACH ROW
WHEN (
  (OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL)
  OR (OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL)
)
EXECUTE FUNCTION notify_refresh_session_revocation();
