DELETE FROM "notification_push_deliveries"
WHERE "notification_id" IN (
	SELECT "id"
	FROM "notifications"
	WHERE "kind" IN ('EXPENSE', 'SETTLEMENT', 'REMINDER')
);--> statement-breakpoint
DELETE FROM "outbox_events"
WHERE "aggregate_type" = 'notification'
	AND "event_type" LIKE 'notification.push_%'
	AND "aggregate_id" IN (
		SELECT "id"
		FROM "notifications"
		WHERE "kind" IN ('EXPENSE', 'SETTLEMENT', 'REMINDER')
	);--> statement-breakpoint
DELETE FROM "notifications"
WHERE "kind" IN ('EXPENSE', 'SETTLEMENT', 'REMINDER');--> statement-breakpoint
DELETE FROM "outbox_events"
WHERE "event_type" LIKE 'expense.%'
	OR "event_type" LIKE 'settlement.%'
	OR "event_type" = 'reminder.created';--> statement-breakpoint
ALTER TABLE "activity_events" DISABLE TRIGGER "activity_events_append_only";--> statement-breakpoint
DELETE FROM "activity_events"
WHERE "aggregate_type" IN ('EXPENSE', 'SETTLEMENT', 'REMINDER')
	OR "event_type" LIKE 'EXPENSE_%'
	OR "event_type" LIKE 'SETTLEMENT_%'
	OR "event_type" LIKE 'REMINDER_%';--> statement-breakpoint
ALTER TABLE "activity_events" ENABLE TRIGGER "activity_events_append_only";--> statement-breakpoint
ALTER TABLE "ledger_postings" DISABLE TRIGGER "ledger_postings_append_only";--> statement-breakpoint
ALTER TABLE "event_allocations" DISABLE TRIGGER "event_allocations_append_only";--> statement-breakpoint
ALTER TABLE "financial_events" DISABLE TRIGGER "financial_events_append_only";--> statement-breakpoint
ALTER TABLE "expense_payers" DISABLE TRIGGER "expense_payers_append_only";--> statement-breakpoint
ALTER TABLE "expense_splits" DISABLE TRIGGER "expense_splits_append_only";--> statement-breakpoint
ALTER TABLE "expenses" DISABLE TRIGGER "expenses_append_only";--> statement-breakpoint
ALTER TABLE "payments" DISABLE TRIGGER "payments_append_only";--> statement-breakpoint
ALTER TABLE "personal_transactions" DISABLE TRIGGER "personal_transactions_append_only";--> statement-breakpoint
ALTER TABLE "reminder_requests" DISABLE TRIGGER "reminder_requests_append_only";--> statement-breakpoint
DELETE FROM "ledger_postings";--> statement-breakpoint
DELETE FROM "event_allocations";--> statement-breakpoint
DELETE FROM "financial_events";--> statement-breakpoint
DELETE FROM "expense_payers";--> statement-breakpoint
DELETE FROM "expense_splits";--> statement-breakpoint
DELETE FROM "expenses";--> statement-breakpoint
DELETE FROM "payments";--> statement-breakpoint
DELETE FROM "personal_transactions";--> statement-breakpoint
DELETE FROM "reminder_requests";--> statement-breakpoint
SET CONSTRAINTS ALL IMMEDIATE;--> statement-breakpoint
ALTER TABLE "ledger_postings" ENABLE TRIGGER "ledger_postings_append_only";--> statement-breakpoint
ALTER TABLE "event_allocations" ENABLE TRIGGER "event_allocations_append_only";--> statement-breakpoint
ALTER TABLE "financial_events" ENABLE TRIGGER "financial_events_append_only";--> statement-breakpoint
ALTER TABLE "expense_payers" ENABLE TRIGGER "expense_payers_append_only";--> statement-breakpoint
ALTER TABLE "expense_splits" ENABLE TRIGGER "expense_splits_append_only";--> statement-breakpoint
ALTER TABLE "expenses" ENABLE TRIGGER "expenses_append_only";--> statement-breakpoint
ALTER TABLE "payments" ENABLE TRIGGER "payments_append_only";--> statement-breakpoint
ALTER TABLE "personal_transactions" ENABLE TRIGGER "personal_transactions_append_only";--> statement-breakpoint
ALTER TABLE "reminder_requests" ENABLE TRIGGER "reminder_requests_append_only";--> statement-breakpoint
DROP TABLE IF EXISTS "balance_projections" CASCADE;--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "default_currency" TO "display_currency";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "display_currency" SET DEFAULT 'PKR';--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_currency_check";--> statement-breakpoint
ALTER TABLE "ledger_postings" DROP CONSTRAINT "ledger_postings_currency_check";--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_currency_check";--> statement-breakpoint
ALTER TABLE "personal_transactions" DROP CONSTRAINT "personal_transactions_currency_check";--> statement-breakpoint
ALTER TABLE "reminder_requests" DROP CONSTRAINT "reminder_requests_currency_check";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_default_currency_check";--> statement-breakpoint
DROP INDEX "reminder_requests_cooldown_idx";--> statement-breakpoint
CREATE INDEX "reminder_requests_cooldown_idx" ON "reminder_requests" USING btree ("ledger_id","requester_user_id","recipient_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "expenses" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "ledger_postings" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "personal_transactions" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "reminder_requests" DROP COLUMN "currency";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_display_currency_check" CHECK ("users"."display_currency"::text IN ('PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'));--> statement-breakpoint

DO $$
DECLARE
	function_definition text;
	neutral_definition text;
BEGIN
	SELECT pg_get_functiondef('assert_expense_allocations(uuid)'::regprocedure)
	INTO function_definition;
	neutral_definition := regexp_replace(
		function_definition,
		E'\\n[[:space:]]*OR previous_record\\.currency <> expense_record\\.currency',
		''
	);
	IF neutral_definition = function_definition
		OR neutral_definition LIKE '%expense_record.currency%'
	THEN
		RAISE EXCEPTION 'Could not neutralize assert_expense_allocations(uuid)';
	END IF;
	EXECUTE neutral_definition;

	SELECT pg_get_functiondef('assert_payment_revision(uuid)'::regprocedure)
	INTO function_definition;
	neutral_definition := regexp_replace(
		function_definition,
		E'\\n[[:space:]]*OR previous_record\\.currency <> payment_record\\.currency',
		''
	);
	IF neutral_definition = function_definition
		OR neutral_definition LIKE '%payment_record.currency%'
	THEN
		RAISE EXCEPTION 'Could not neutralize assert_payment_revision(uuid)';
	END IF;
	EXECUTE neutral_definition;

	SELECT pg_get_functiondef('assert_payment_event(uuid)'::regprocedure)
	INTO function_definition;
	neutral_definition := regexp_replace(
		function_definition,
		E'\\n[[:space:]]*AND currency = payment_record\\.currency',
		''
	);
	IF neutral_definition = function_definition
		OR neutral_definition LIKE '%payment_record.currency%'
	THEN
		RAISE EXCEPTION 'Could not neutralize assert_payment_event(uuid)';
	END IF;
	EXECUTE neutral_definition;

	SELECT pg_get_functiondef('assert_personal_transaction_revision(uuid)'::regprocedure)
	INTO function_definition;
	neutral_definition := regexp_replace(
		function_definition,
		E'\\n[[:space:]]*OR previous_record\\.currency <> transaction_record\\.currency',
		''
	);
	IF neutral_definition = function_definition
		OR neutral_definition LIKE '%transaction_record.currency%'
	THEN
		RAISE EXCEPTION 'Could not neutralize assert_personal_transaction_revision(uuid)';
	END IF;
	EXECUTE neutral_definition;
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
	source_created_by_user_id uuid;
	posting_count integer;
	allocation_count integer;
	invalid_posting_count integer;
	unbalanced_event_count integer;
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
		SELECT ledger_id, created_by_user_id
		INTO source_ledger_id, source_created_by_user_id
		FROM expenses
		WHERE id = event_record.expense_id;
	ELSE
		SELECT ledger_id
		INTO source_ledger_id
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
		AND NOT EXISTS (
			SELECT 1
			FROM ledger_members member
			WHERE member.ledger_id = event_record.ledger_id
				AND member.user_id = posting.user_id
		);

	SELECT count(*) INTO unbalanced_event_count
	FROM (
		SELECT financial_event_id
		FROM ledger_postings
		WHERE financial_event_id = target_event_id
		GROUP BY financial_event_id
		HAVING sum(amount_minor) <> 0
	) unbalanced;

	IF invalid_posting_count <> 0 OR unbalanced_event_count <> 0 THEN
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
				coalesce(original.amount_minor, 0) + coalesce(reversal.amount_minor, 0) AS net_minor
			FROM (
				SELECT user_id, amount_minor
				FROM ledger_postings
				WHERE financial_event_id = event_record.reverses_event_id
			) original
			FULL JOIN (
				SELECT user_id, amount_minor
				FROM ledger_postings
				WHERE financial_event_id = target_event_id
			) reversal
				ON original.user_id = reversal.user_id
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
$$;
