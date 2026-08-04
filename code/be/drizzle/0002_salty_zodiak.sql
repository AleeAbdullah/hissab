DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM users
    WHERE default_currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) OR EXISTS (
    SELECT 1 FROM expenses
    WHERE currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) OR EXISTS (
    SELECT 1 FROM payments
    WHERE currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) OR EXISTS (
    SELECT 1 FROM personal_transactions
    WHERE currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) OR EXISTS (
    SELECT 1 FROM ledger_postings
    WHERE currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) OR EXISTS (
    SELECT 1 FROM balance_projections
    WHERE currency::text NOT IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR')
  ) THEN
    RAISE EXCEPTION 'Cannot apply the v1 currency allowlist while unsupported currency data exists; Hissab will not convert it automatically';
  END IF;

  IF EXISTS (SELECT 1 FROM expenses)
    OR EXISTS (SELECT 1 FROM financial_events)
    OR EXISTS (SELECT 1 FROM event_allocations)
    OR EXISTS (SELECT 1 FROM ledger_postings)
    OR EXISTS (SELECT 1 FROM balance_projections)
    OR EXISTS (SELECT 1 FROM categories WHERE is_system)
  THEN
    RAISE EXCEPTION 'Cannot add immutable shared-expense history to existing financial or system-category data';
  END IF;
END;
$$;--> statement-breakpoint
ALTER TABLE "balance_projections" DROP CONSTRAINT "balance_projections_currency_check";--> statement-breakpoint
ALTER TABLE "event_allocations" DROP CONSTRAINT "event_allocations_role_shape_check";--> statement-breakpoint
ALTER TABLE "expense_splits" DROP CONSTRAINT "expense_splits_nonnegative_owed_check";--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_currency_check";--> statement-breakpoint
ALTER TABLE "ledger_postings" DROP CONSTRAINT "ledger_postings_currency_check";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_currency_check";--> statement-breakpoint
ALTER TABLE "personal_transactions" DROP CONSTRAINT "personal_transactions_currency_check";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_default_currency_check";--> statement-breakpoint
DROP INDEX "financial_events_expense_created_uq";--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "category_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "code" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "root_expense_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "replaces_expense_id" uuid;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_root_expense_id_expenses_id_fk" FOREIGN KEY ("root_expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_replaces_expense_id_expenses_id_fk" FOREIGN KEY ("replaces_expense_id") REFERENCES "public"."expenses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_system_code_uq" ON "categories" USING btree ("code") WHERE "categories"."is_system";--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_root_version_uq" ON "expenses" USING btree ("root_expense_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_replaces_expense_uq" ON "expenses" USING btree ("replaces_expense_id") WHERE "expenses"."replaces_expense_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "financial_events_expense_effect_uq" ON "financial_events" USING btree ("expense_id") WHERE "financial_events"."expense_id" IS NOT NULL AND "financial_events"."event_type" <> 'REVERSAL';--> statement-breakpoint
ALTER TABLE "balance_projections" ADD CONSTRAINT "balance_projections_currency_check" CHECK ("balance_projections"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_system_code_check" CHECK ("categories"."is_system" = ("categories"."code" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "event_allocations" ADD CONSTRAINT "event_allocations_role_shape_check" CHECK (("event_allocations"."role" = 'PAYER'
          AND "event_allocations"."amount_minor" > 0
          AND "event_allocations"."split_method" IS NULL)
        OR ("event_allocations"."role" = 'PARTICIPANT'
          AND "event_allocations"."amount_minor" > 0
          AND "event_allocations"."split_method" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_positive_owed_check" CHECK ("expense_splits"."owed_minor" > 0);--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_currency_check" CHECK ("expenses"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_nonzero_amount_check" CHECK ("ledger_postings"."amount_minor" <> 0);--> statement-breakpoint
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_currency_check" CHECK ("ledger_postings"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_currency_check" CHECK ("payments"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint
ALTER TABLE "personal_transactions" ADD CONSTRAINT "personal_transactions_currency_check" CHECK ("personal_transactions"."currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_default_currency_check" CHECK ("users"."default_currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint

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
  (NULL, 'FOOD_AND_DRINK', 'Food & Drink', 'EXPENSE', 'food-and-drink', 'copper', true),
  (NULL, 'GROCERIES', 'Groceries', 'EXPENSE', 'groceries', 'copper', true),
  (NULL, 'TRANSPORT', 'Transport', 'EXPENSE', 'transport', 'copper', true),
  (NULL, 'ACCOMMODATION', 'Accommodation', 'EXPENSE', 'accommodation', 'copper', true),
  (NULL, 'UTILITIES', 'Utilities', 'EXPENSE', 'utilities', 'copper', true),
  (NULL, 'ENTERTAINMENT', 'Entertainment', 'EXPENSE', 'entertainment', 'copper', true),
  (NULL, 'SHOPPING', 'Shopping', 'EXPENSE', 'shopping', 'copper', true),
  (NULL, 'HEALTHCARE', 'Healthcare', 'EXPENSE', 'healthcare', 'copper', true),
  (NULL, 'OTHER', 'Other', 'EXPENSE', 'other', 'copper', true);--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_expense_allocations(target_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  expense_record expenses%ROWTYPE;
  previous_record expenses%ROWTYPE;
  payer_total numeric;
  split_total numeric;
  payer_count integer;
  split_count integer;
  split_method_count integer;
  split_method_text text;
  invalid_member_count integer;
  invalid_equal_count integer;
  effect_count integer;
  effect_type financial_event_type;
  previous_effect_id uuid;
  reversal_count integer;
  tombstone_mismatch_count integer;
BEGIN
  SELECT * INTO expense_record
  FROM expenses
  WHERE id = target_expense_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM ledgers ledger
    JOIN ledger_members member
      ON member.ledger_id = ledger.id
     AND member.user_id = expense_record.created_by_user_id
     AND member.status = 'ACTIVE'
    WHERE ledger.id = expense_record.ledger_id
      AND ledger.status = 'ACTIVE'
  ) THEN
    RAISE EXCEPTION 'Expense % requires an active ledger creator', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM categories category
    WHERE category.id = expense_record.category_id
      AND category.is_system
      AND category.kind = 'EXPENSE'
      AND category.code IN (
        'FOOD_AND_DRINK',
        'GROCERIES',
        'TRANSPORT',
        'ACCOMMODATION',
        'UTILITIES',
        'ENTERTAINMENT',
        'SHOPPING',
        'HEALTHCARE',
        'OTHER'
      )
  ) THEN
    RAISE EXCEPTION 'Expense % requires an approved system category', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  IF expense_record.version = 1 THEN
    IF expense_record.root_expense_id <> expense_record.id
      OR expense_record.replaces_expense_id IS NOT NULL
      OR expense_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Expense % has an invalid root revision', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF expense_record.root_expense_id = expense_record.id
      OR expense_record.replaces_expense_id IS NULL
    THEN
      RAISE EXCEPTION 'Expense % has an invalid replacement shape', target_expense_id
        USING ERRCODE = '23514';
    END IF;

    SELECT * INTO previous_record
    FROM expenses
    WHERE id = expense_record.replaces_expense_id;

    IF NOT FOUND
      OR previous_record.root_expense_id <> expense_record.root_expense_id
      OR previous_record.version + 1 <> expense_record.version
      OR previous_record.ledger_id <> expense_record.ledger_id
      OR previous_record.currency <> expense_record.currency
      OR previous_record.created_by_user_id <> expense_record.created_by_user_id
      OR previous_record.status <> 'ACTIVE'
    THEN
      RAISE EXCEPTION 'Expense % does not continue its immutable revision chain', target_expense_id
        USING ERRCODE = '23514';
    END IF;

    IF expense_record.status = 'DELETED'
      AND (
        expense_record.description IS DISTINCT FROM previous_record.description
        OR expense_record.total_minor IS DISTINCT FROM previous_record.total_minor
        OR expense_record.category_id IS DISTINCT FROM previous_record.category_id
        OR expense_record.occurred_at IS DISTINCT FROM previous_record.occurred_at
      )
    THEN
      RAISE EXCEPTION 'Expense tombstone % must preserve its replaced snapshot', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT count(*), coalesce(sum(amount_minor), 0)
  INTO payer_count, payer_total
  FROM expense_payers
  WHERE expense_id = target_expense_id;

  SELECT count(*), coalesce(sum(owed_minor), 0),
         count(DISTINCT split_method), min(split_method::text)
  INTO split_count, split_total, split_method_count, split_method_text
  FROM expense_splits
  WHERE expense_id = target_expense_id;

  IF payer_count = 0 OR payer_total <> expense_record.total_minor THEN
    RAISE EXCEPTION 'Expense % payer allocation must equal total', target_expense_id
      USING ERRCODE = '23514';
  END IF;
  IF split_count = 0
    OR split_total <> expense_record.total_minor
    OR split_method_count <> 1
  THEN
    RAISE EXCEPTION 'Expense % split allocation must use one method and equal total', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO invalid_member_count
  FROM (
    SELECT user_id FROM expense_payers WHERE expense_id = target_expense_id
    UNION
    SELECT user_id FROM expense_splits WHERE expense_id = target_expense_id
  ) participant
  WHERE NOT EXISTS (
    SELECT 1
    FROM ledger_members member
    WHERE member.ledger_id = expense_record.ledger_id
      AND member.user_id = participant.user_id
      AND member.status = 'ACTIVE'
  );

  IF invalid_member_count <> 0 THEN
    RAISE EXCEPTION 'Expense % allocations require active ledger members', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  IF split_method_text = 'EQUAL' THEN
    SELECT count(*) INTO invalid_equal_count
    FROM (
      SELECT owed_minor,
             expense_record.total_minor / split_count AS base_minor,
             expense_record.total_minor % split_count AS remainder_minor,
             row_number() OVER (ORDER BY user_id) AS participant_order
      FROM expense_splits
      WHERE expense_id = target_expense_id
    ) expected
    WHERE owed_minor <> base_minor
      + CASE WHEN participant_order <= remainder_minor THEN 1 ELSE 0 END;

    IF invalid_equal_count <> 0 THEN
      RAISE EXCEPTION 'Expense % has an invalid equal split remainder', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF expense_record.status = 'DELETED' THEN
    SELECT count(*) INTO tombstone_mismatch_count
    FROM (
      (SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = target_expense_id
       EXCEPT
       SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = previous_record.id)
      UNION ALL
      (SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = previous_record.id
       EXCEPT
       SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = target_expense_id)
      UNION ALL
      (SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = target_expense_id
       EXCEPT
       SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = previous_record.id)
      UNION ALL
      (SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = previous_record.id
       EXCEPT
       SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = target_expense_id)
    ) mismatch;

    IF tombstone_mismatch_count <> 0 THEN
      RAISE EXCEPTION 'Expense tombstone % must preserve its allocations', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  END IF;

  SELECT count(*) INTO effect_count
  FROM financial_events
  WHERE expense_id = target_expense_id
    AND event_type <> 'REVERSAL';

  IF expense_record.status = 'ACTIVE' THEN
    IF effect_count <> 1 THEN
      RAISE EXCEPTION 'Active expense revision % requires one effect event', target_expense_id
        USING ERRCODE = '23514';
    END IF;

    SELECT event_type INTO effect_type
    FROM financial_events
    WHERE expense_id = target_expense_id
      AND event_type <> 'REVERSAL';

    IF (expense_record.version = 1 AND effect_type <> 'CREATED')
      OR (expense_record.version > 1 AND effect_type <> 'REPLACEMENT')
    THEN
      RAISE EXCEPTION 'Expense revision % has the wrong effect event type', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  ELSIF effect_count <> 0 THEN
    RAISE EXCEPTION 'Expense tombstone % cannot have an effect event', target_expense_id
      USING ERRCODE = '23514';
  END IF;

  IF expense_record.version > 1 THEN
    SELECT id INTO previous_effect_id
    FROM financial_events
    WHERE expense_id = previous_record.id
      AND event_type <> 'REVERSAL';

    SELECT count(*) INTO reversal_count
    FROM financial_events
    WHERE event_type = 'REVERSAL'
      AND expense_id = previous_record.id
      AND reverses_event_id = previous_effect_id;

    IF previous_effect_id IS NULL OR reversal_count <> 1 THEN
      RAISE EXCEPTION 'Expense revision % requires a paired reversal', target_expense_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION assert_financial_event(target_event_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  event_record financial_events%ROWTYPE;
  reversed_event financial_events%ROWTYPE;
  source_ledger_id uuid;
  source_currency char(3);
  source_created_by_user_id uuid;
  posting_count integer;
  allocation_count integer;
  invalid_posting_count integer;
  unbalanced_currency_count integer;
  snapshot_mismatch_count integer;
  posting_mismatch_count integer;
  reversal_mismatch_count integer;
BEGIN
  SELECT * INTO event_record
  FROM financial_events
  WHERE id = target_event_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF event_record.expense_id IS NOT NULL THEN
    SELECT ledger_id, currency, created_by_user_id
    INTO source_ledger_id, source_currency, source_created_by_user_id
    FROM expenses
    WHERE id = event_record.expense_id;
  ELSE
    SELECT ledger_id, currency
    INTO source_ledger_id, source_currency
    FROM payments
    WHERE id = event_record.payment_id;
  END IF;

  IF source_ledger_id IS DISTINCT FROM event_record.ledger_id THEN
    RAISE EXCEPTION 'Financial event % must use its source ledger', target_event_id
      USING ERRCODE = '23514';
  END IF;

  IF event_record.expense_id IS NOT NULL
    AND event_record.created_by_user_id <> source_created_by_user_id
  THEN
    RAISE EXCEPTION 'Expense event % must use its expense creator', target_event_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO posting_count
  FROM ledger_postings
  WHERE financial_event_id = target_event_id;

  SELECT count(*) INTO invalid_posting_count
  FROM ledger_postings posting
  WHERE posting.financial_event_id = target_event_id
    AND (
      posting.currency <> source_currency
      OR NOT EXISTS (
        SELECT 1
        FROM ledger_members member
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

  IF invalid_posting_count <> 0 OR unbalanced_currency_count <> 0 THEN
    RAISE EXCEPTION 'Financial event % has invalid or unbalanced postings', target_event_id
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*) INTO allocation_count
  FROM event_allocations
  WHERE financial_event_id = target_event_id;

  IF event_record.expense_id IS NULL THEN
    IF allocation_count <> 0 OR posting_count = 0 THEN
      RAISE EXCEPTION 'Payment event % has an invalid financial shape', target_event_id
        USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT count(*) INTO snapshot_mismatch_count
    FROM (
      (SELECT user_id, amount_minor, NULL::split_method
       FROM event_allocations
       WHERE financial_event_id = target_event_id AND role = 'PAYER'
       EXCEPT
       SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = event_record.expense_id)
      UNION ALL
      (SELECT user_id, amount_minor, NULL::split_method
       FROM expense_payers WHERE expense_id = event_record.expense_id
       EXCEPT
       SELECT user_id, amount_minor, NULL::split_method
       FROM event_allocations
       WHERE financial_event_id = target_event_id AND role = 'PAYER')
      UNION ALL
      (SELECT user_id, amount_minor, split_method
       FROM event_allocations
       WHERE financial_event_id = target_event_id AND role = 'PARTICIPANT'
       EXCEPT
       SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = event_record.expense_id)
      UNION ALL
      (SELECT user_id, owed_minor, split_method
       FROM expense_splits WHERE expense_id = event_record.expense_id
       EXCEPT
       SELECT user_id, amount_minor, split_method
       FROM event_allocations
       WHERE financial_event_id = target_event_id AND role = 'PARTICIPANT')
    ) mismatch;

    IF snapshot_mismatch_count <> 0 THEN
      RAISE EXCEPTION 'Expense event % allocations must match its expense snapshot', target_event_id
        USING ERRCODE = '23514';
    END IF;

    WITH expected AS (
      SELECT user_id,
             (CASE WHEN event_record.event_type = 'REVERSAL' THEN -1 ELSE 1 END)
             * sum(CASE role WHEN 'PAYER' THEN amount_minor ELSE -amount_minor END) AS amount_minor
      FROM event_allocations
      WHERE financial_event_id = target_event_id
      GROUP BY user_id
      HAVING sum(CASE role WHEN 'PAYER' THEN amount_minor ELSE -amount_minor END) <> 0
    ), actual AS (
      SELECT user_id, amount_minor
      FROM ledger_postings
      WHERE financial_event_id = target_event_id
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
      RAISE EXCEPTION 'Expense event % postings must equal paid minus owed', target_event_id
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

    IF reversed_event.expense_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM expenses replacement
        WHERE replacement.replaces_expense_id = reversed_event.expense_id
      )
    THEN
      RAISE EXCEPTION 'Expense reversal % requires a replacement or tombstone', target_event_id
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$$;--> statement-breakpoint

CREATE TRIGGER categories_system_append_only
BEFORE UPDATE OR DELETE ON categories
FOR EACH ROW
WHEN (OLD.is_system)
EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER expenses_append_only
BEFORE UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER expense_payers_append_only
BEFORE UPDATE OR DELETE ON expense_payers
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE TRIGGER expense_splits_append_only
BEFORE UPDATE OR DELETE ON expense_splits
FOR EACH ROW EXECUTE FUNCTION reject_append_only_mutation();--> statement-breakpoint

CREATE OR REPLACE FUNCTION project_ledger_posting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  posting_ledger_id uuid;
BEGIN
  SELECT ledger_id INTO posting_ledger_id
  FROM financial_events
  WHERE id = NEW.financial_event_id;

  INSERT INTO balance_projections (
    ledger_id,
    user_id,
    currency,
    net_minor,
    last_financial_event_id,
    updated_at
  )
  VALUES (
    posting_ledger_id,
    NEW.user_id,
    NEW.currency,
    NEW.amount_minor,
    NEW.financial_event_id,
    now()
  )
  ON CONFLICT (ledger_id, user_id, currency)
  DO UPDATE SET
    net_minor = balance_projections.net_minor + EXCLUDED.net_minor,
    last_financial_event_id = EXCLUDED.last_financial_event_id,
    updated_at = now();

  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER ledger_postings_projection
AFTER INSERT ON ledger_postings
FOR EACH ROW EXECUTE FUNCTION project_ledger_posting();
