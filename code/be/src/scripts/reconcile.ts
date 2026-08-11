import 'dotenv/config';

import { performance } from 'node:perf_hooks';

import { Pool, type PoolClient } from 'pg';

interface Sample {
  id: string;
  reason: string;
}

interface CheckResult {
  name: string;
  violationCount: number;
  samples: Sample[];
}

interface Check {
  name: string;
  sql: string;
}

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

const checks: Check[] = [
  {
    name: 'schema_guardrails',
    sql: `
      WITH expected(table_name, trigger_name) AS (
        VALUES
          ('activity_events', 'activity_events_append_only'),
          ('categories', 'categories_system_append_only'),
          ('event_allocations', 'event_allocations_append_only'),
          ('event_allocations', 'event_allocations_integrity_check'),
          ('expense_payers', 'expense_payers_append_only'),
          ('expense_payers', 'expense_payers_total_check'),
          ('expense_splits', 'expense_splits_append_only'),
          ('expense_splits', 'expense_splits_total_check'),
          ('expenses', 'expenses_active_users_check'),
          ('expenses', 'expenses_allocations_check'),
          ('expenses', 'expenses_append_only'),
          ('financial_events', 'financial_events_append_only'),
          ('financial_events', 'financial_events_integrity_check'),
          ('financial_events', 'financial_events_no_reversal_of_reversal'),
          ('financial_events', 'financial_events_payment_integrity_check'),
          ('group_profiles', 'group_profiles_shape_check'),
          ('ledger_members', 'ledger_members_shape_check'),
          ('ledger_postings', 'ledger_postings_append_only'),
          ('ledger_postings', 'ledger_postings_integrity_check'),
          ('ledger_postings', 'ledger_postings_payment_integrity_check'),
          ('ledgers', 'ledgers_shape_check'),
          ('payments', 'payments_active_users_check'),
          ('payments', 'payments_append_only'),
          ('payments', 'payments_integrity_check'),
          ('personal_ledgers', 'personal_ledgers_append_only'),
          ('personal_transactions', 'personal_transactions_active_owner_check'),
          ('personal_transactions', 'personal_transactions_append_only'),
          ('personal_transactions', 'personal_transactions_integrity_check'),
          ('refresh_sessions', 'refresh_sessions_revocation_notify'),
          ('reminder_requests', 'reminder_requests_append_only'),
          ('user_identities', 'user_identities_active_user_check'),
          ('users', 'users_personal_ledger_check')
      )
      SELECT '${ZERO_UUID}'::uuid AS entity_id,
             'missing_or_disabled_trigger:' || expected.table_name || '.' || expected.trigger_name AS reason
      FROM expected
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_trigger trigger
        JOIN pg_class relation ON relation.oid = trigger.tgrelid
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'public'
          AND relation.relname = expected.table_name
          AND trigger.tgname = expected.trigger_name
          AND NOT trigger.tgisinternal
          AND trigger.tgenabled <> 'D'
      )
    `,
  },
  {
    name: 'expense_history',
    sql: `
      WITH payer_totals AS (
        SELECT expense_id, count(*) AS allocation_count, sum(amount_minor) AS total_minor
        FROM expense_payers
        GROUP BY expense_id
      ), split_totals AS (
        SELECT expense_id,
               count(*) AS allocation_count,
               sum(owed_minor) AS total_minor,
               count(DISTINCT split_method) AS method_count
        FROM expense_splits
        GROUP BY expense_id
      ), equal_splits AS (
        SELECT split.expense_id,
               split.owed_minor,
               expense.total_minor / count(*) OVER (PARTITION BY split.expense_id) AS base_minor,
               expense.total_minor % count(*) OVER (PARTITION BY split.expense_id) AS remainder_minor,
               row_number() OVER (PARTITION BY split.expense_id ORDER BY split.user_id) AS allocation_order
        FROM expense_splits split
        JOIN expenses expense ON expense.id = split.expense_id
        WHERE split.split_method = 'EQUAL'
      )
      SELECT expense.id AS entity_id, 'invalid_revision_chain' AS reason
      FROM expenses expense
      LEFT JOIN expenses previous ON previous.id = expense.replaces_expense_id
      WHERE (expense.version = 1 AND (
               expense.root_expense_id <> expense.id
               OR expense.replaces_expense_id IS NOT NULL
               OR expense.status <> 'ACTIVE'
             ))
         OR (expense.version > 1 AND (
               expense.root_expense_id = expense.id
               OR previous.id IS NULL
               OR previous.root_expense_id <> expense.root_expense_id
               OR previous.version + 1 <> expense.version
               OR previous.ledger_id <> expense.ledger_id
               OR previous.created_by_user_id <> expense.created_by_user_id
               OR previous.status <> 'ACTIVE'
             ))
      UNION ALL
      SELECT expense.id, 'invalid_tombstone_snapshot'
      FROM expenses expense
      JOIN expenses previous ON previous.id = expense.replaces_expense_id
      WHERE expense.status = 'DELETED'
        AND (
          expense.description IS DISTINCT FROM previous.description
          OR expense.total_minor IS DISTINCT FROM previous.total_minor
          OR expense.category_id IS DISTINCT FROM previous.category_id
          OR expense.occurred_at IS DISTINCT FROM previous.occurred_at
        )
      UNION ALL
      SELECT expense.id, 'invalid_allocation_totals_or_method'
      FROM expenses expense
      LEFT JOIN payer_totals payer ON payer.expense_id = expense.id
      LEFT JOIN split_totals split ON split.expense_id = expense.id
      WHERE coalesce(payer.allocation_count, 0) = 0
         OR payer.total_minor IS DISTINCT FROM expense.total_minor
         OR coalesce(split.allocation_count, 0) = 0
         OR split.total_minor IS DISTINCT FROM expense.total_minor
         OR split.method_count IS DISTINCT FROM 1::bigint
      UNION ALL
      SELECT DISTINCT equal_split.expense_id, 'invalid_equal_split_remainder'
      FROM equal_splits equal_split
      WHERE equal_split.owed_minor <> equal_split.base_minor
        + CASE WHEN equal_split.allocation_order <= equal_split.remainder_minor THEN 1 ELSE 0 END
      UNION ALL
      SELECT expense.id, 'invalid_tombstone_allocations'
      FROM expenses expense
      JOIN expenses previous ON previous.id = expense.replaces_expense_id
      WHERE expense.status = 'DELETED'
        AND (
          EXISTS (
            (SELECT user_id, amount_minor FROM expense_payers WHERE expense_id = expense.id
             EXCEPT
             SELECT user_id, amount_minor FROM expense_payers WHERE expense_id = previous.id)
            UNION ALL
            (SELECT user_id, amount_minor FROM expense_payers WHERE expense_id = previous.id
             EXCEPT
             SELECT user_id, amount_minor FROM expense_payers WHERE expense_id = expense.id)
          )
          OR EXISTS (
            (SELECT user_id, owed_minor, split_method FROM expense_splits WHERE expense_id = expense.id
             EXCEPT
             SELECT user_id, owed_minor, split_method FROM expense_splits WHERE expense_id = previous.id)
            UNION ALL
            (SELECT user_id, owed_minor, split_method FROM expense_splits WHERE expense_id = previous.id
             EXCEPT
             SELECT user_id, owed_minor, split_method FROM expense_splits WHERE expense_id = expense.id)
          )
        )
      UNION ALL
      SELECT expense.id, 'invalid_system_category'
      FROM expenses expense
      LEFT JOIN categories category ON category.id = expense.category_id
      WHERE category.id IS NULL
         OR NOT category.is_system
         OR category.kind <> 'EXPENSE'
         OR category.code NOT IN (
           'FOOD_AND_DRINK', 'GROCERIES', 'TRANSPORT', 'ACCOMMODATION',
           'UTILITIES', 'ENTERTAINMENT', 'SHOPPING', 'HEALTHCARE', 'OTHER'
         )
    `,
  },
  {
    name: 'settlement_history',
    sql: `
      SELECT payment.id AS entity_id, 'invalid_revision_chain' AS reason
      FROM payments payment
      LEFT JOIN payments previous ON previous.id = payment.replaces_payment_id
      WHERE (payment.version = 1 AND (
               payment.root_payment_id <> payment.id
               OR payment.replaces_payment_id IS NOT NULL
               OR payment.status <> 'ACTIVE'
             ))
         OR (payment.version > 1 AND (
               payment.root_payment_id = payment.id
               OR previous.id IS NULL
               OR previous.root_payment_id <> payment.root_payment_id
               OR previous.version + 1 <> payment.version
               OR previous.ledger_id <> payment.ledger_id
               OR previous.created_by_user_id <> payment.created_by_user_id
               OR previous.status <> 'ACTIVE'
             ))
      UNION ALL
      SELECT payment.id, 'invalid_tombstone_snapshot'
      FROM payments payment
      JOIN payments previous ON previous.id = payment.replaces_payment_id
      WHERE payment.status = 'DELETED'
        AND (
          payment.from_user_id IS DISTINCT FROM previous.from_user_id
          OR payment.to_user_id IS DISTINCT FROM previous.to_user_id
          OR payment.amount_minor IS DISTINCT FROM previous.amount_minor
          OR payment.occurred_at IS DISTINCT FROM previous.occurred_at
        )
    `,
  },
  {
    name: 'financial_events',
    sql: `
      WITH event_sources AS (
        SELECT event.id,
               event.ledger_id,
               event.event_type,
               event.reverses_event_id,
               event.created_by_user_id,
               event.expense_id,
               event.payment_id,
               coalesce(expense.ledger_id, payment.ledger_id) AS source_ledger_id,
               coalesce(expense.created_by_user_id, payment.created_by_user_id) AS source_creator_id
        FROM financial_events event
        LEFT JOIN expenses expense ON expense.id = event.expense_id
        LEFT JOIN payments payment ON payment.id = event.payment_id
      ), expense_expected_postings AS (
        SELECT source.id AS event_id,
               allocation.user_id,
               (CASE WHEN source.event_type = 'REVERSAL' THEN -1 ELSE 1 END)
                 * sum(CASE allocation.role WHEN 'PAYER' THEN allocation.amount_minor ELSE -allocation.amount_minor END) AS amount_minor
        FROM event_sources source
        JOIN event_allocations allocation ON allocation.financial_event_id = source.id
        WHERE source.expense_id IS NOT NULL
        GROUP BY source.id, allocation.user_id, source.event_type
        HAVING sum(CASE allocation.role WHEN 'PAYER' THEN allocation.amount_minor ELSE -allocation.amount_minor END) <> 0
      ), payment_expected_postings AS (
        SELECT source.id AS event_id,
               payment.from_user_id AS user_id,
               CASE WHEN source.event_type = 'REVERSAL' THEN -payment.amount_minor ELSE payment.amount_minor END AS amount_minor
        FROM event_sources source
        JOIN payments payment ON payment.id = source.payment_id
        UNION ALL
        SELECT source.id,
               payment.to_user_id,
               CASE WHEN source.event_type = 'REVERSAL' THEN payment.amount_minor ELSE -payment.amount_minor END
        FROM event_sources source
        JOIN payments payment ON payment.id = source.payment_id
      ), expected_postings AS (
        SELECT * FROM expense_expected_postings
        UNION ALL
        SELECT * FROM payment_expected_postings
      ), posting_mismatches AS (
        (SELECT event_id, user_id, amount_minor FROM expected_postings
         EXCEPT
         SELECT financial_event_id, user_id, amount_minor FROM ledger_postings)
        UNION ALL
        (SELECT financial_event_id, user_id, amount_minor FROM ledger_postings
         EXCEPT
         SELECT event_id, user_id, amount_minor FROM expected_postings)
      ), expected_expense_allocations AS (
        SELECT event.id AS event_id, payer.user_id, 'PAYER'::event_allocation_role AS role,
               payer.amount_minor, NULL::split_method AS split_method
         FROM financial_events event
         JOIN expense_payers payer ON payer.expense_id = event.expense_id
         WHERE event.expense_id IS NOT NULL
        UNION ALL
        SELECT event.id, split.user_id, 'PARTICIPANT'::event_allocation_role,
               split.owed_minor, split.split_method
         FROM financial_events event
         JOIN expense_splits split ON split.expense_id = event.expense_id
         WHERE event.expense_id IS NOT NULL
      ), actual_expense_allocations AS (
        SELECT allocation.financial_event_id AS event_id,
               allocation.user_id,
               allocation.role,
               allocation.amount_minor,
               allocation.split_method
        FROM event_allocations allocation
        JOIN financial_events event ON event.id = allocation.financial_event_id
        WHERE event.expense_id IS NOT NULL
      ), expense_allocation_mismatches AS (
        (SELECT event_id, user_id, role, amount_minor, split_method FROM expected_expense_allocations
         EXCEPT
         SELECT event_id, user_id, role, amount_minor, split_method FROM actual_expense_allocations)
        UNION ALL
        (SELECT event_id, user_id, role, amount_minor, split_method FROM actual_expense_allocations
         EXCEPT
         SELECT event_id, user_id, role, amount_minor, split_method FROM expected_expense_allocations)
      ), reversal_posting_mismatches AS (
        SELECT reversal.id AS event_id
        FROM financial_events reversal
        WHERE reversal.event_type = 'REVERSAL'
          AND EXISTS (
            SELECT 1
            FROM (
              SELECT coalesce(original.user_id, reversed.user_id) AS user_id,
                     coalesce(original.amount_minor, 0) + coalesce(reversed.amount_minor, 0) AS net_minor
              FROM ledger_postings original
              FULL JOIN ledger_postings reversed
                ON reversed.financial_event_id = reversal.id
               AND original.financial_event_id = reversal.reverses_event_id
               AND reversed.user_id = original.user_id
              WHERE original.financial_event_id = reversal.reverses_event_id
                 OR reversed.financial_event_id = reversal.id
            ) compared
            WHERE compared.net_minor <> 0
          )
      ), expense_effect_violations AS (
        SELECT expense.id
        FROM expenses expense
        WHERE (
          expense.status = 'ACTIVE'
          AND (
            (SELECT count(*) FROM financial_events event
             WHERE event.expense_id = expense.id AND event.event_type <> 'REVERSAL') <> 1
            OR NOT EXISTS (
              SELECT 1 FROM financial_events event
              WHERE event.expense_id = expense.id
                AND event.event_type = (CASE WHEN expense.version = 1 THEN 'CREATED' ELSE 'REPLACEMENT' END)::financial_event_type
            )
          )
        ) OR (
          expense.status = 'DELETED'
          AND EXISTS (SELECT 1 FROM financial_events event WHERE event.expense_id = expense.id AND event.event_type <> 'REVERSAL')
        ) OR (
          expense.version > 1
          AND NOT EXISTS (
            SELECT 1
            FROM financial_events previous_effect
            JOIN financial_events reversal ON reversal.reverses_event_id = previous_effect.id
            WHERE previous_effect.expense_id = expense.replaces_expense_id
              AND previous_effect.event_type <> 'REVERSAL'
              AND reversal.event_type = 'REVERSAL'
          )
        )
      ), payment_effect_violations AS (
        SELECT payment.id
        FROM payments payment
        WHERE (
          payment.status = 'ACTIVE'
          AND (
            (SELECT count(*) FROM financial_events event
             WHERE event.payment_id = payment.id AND event.event_type <> 'REVERSAL') <> 1
            OR NOT EXISTS (
              SELECT 1 FROM financial_events event
              WHERE event.payment_id = payment.id
                AND event.event_type = (CASE WHEN payment.version = 1 THEN 'CREATED' ELSE 'REPLACEMENT' END)::financial_event_type
            )
          )
        ) OR (
          payment.status = 'DELETED'
          AND EXISTS (SELECT 1 FROM financial_events event WHERE event.payment_id = payment.id AND event.event_type <> 'REVERSAL')
        ) OR (
          payment.version > 1
          AND NOT EXISTS (
            SELECT 1
            FROM financial_events previous_effect
            JOIN financial_events reversal ON reversal.reverses_event_id = previous_effect.id
            WHERE previous_effect.payment_id = payment.replaces_payment_id
              AND previous_effect.event_type <> 'REVERSAL'
              AND reversal.event_type = 'REVERSAL'
          )
        )
      )
      SELECT source.id AS entity_id, 'invalid_event_source' AS reason
      FROM event_sources source
      WHERE source.source_ledger_id IS NULL
         OR source.ledger_id <> source.source_ledger_id
         OR source.created_by_user_id <> source.source_creator_id
         OR (source.event_type = 'REVERSAL' AND NOT EXISTS (
           SELECT 1 FROM financial_events original
           WHERE original.id = source.reverses_event_id
             AND original.event_type <> 'REVERSAL'
             AND original.ledger_id = source.ledger_id
             AND original.expense_id IS NOT DISTINCT FROM source.expense_id
             AND original.payment_id IS NOT DISTINCT FROM source.payment_id
         ))
      UNION ALL
      SELECT DISTINCT mismatch.event_id, 'postings_do_not_match_snapshot'
      FROM posting_mismatches mismatch
      UNION ALL
      SELECT DISTINCT mismatch.event_id, 'allocations_do_not_match_expense_snapshot'
      FROM expense_allocation_mismatches mismatch
      UNION ALL
      SELECT event.id, 'payment_event_has_allocations'
      FROM financial_events event
      WHERE event.payment_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM event_allocations allocation WHERE allocation.financial_event_id = event.id)
      UNION ALL
      SELECT event.id, 'posting_user_not_in_ledger'
      FROM financial_events event
      WHERE EXISTS (
        SELECT 1
        FROM ledger_postings posting
        WHERE posting.financial_event_id = event.id
          AND NOT EXISTS (
            SELECT 1 FROM ledger_members member
            WHERE member.ledger_id = event.ledger_id AND member.user_id = posting.user_id
          )
      )
      UNION ALL
      SELECT event.id, 'event_postings_not_zero_sum'
      FROM financial_events event
      WHERE EXISTS (
        SELECT 1 FROM ledger_postings posting
        WHERE posting.financial_event_id = event.id
        HAVING sum(posting.amount_minor) <> 0
      )
      UNION ALL
      SELECT DISTINCT mismatch.event_id, 'reversal_does_not_negate_original'
      FROM reversal_posting_mismatches mismatch
      UNION ALL
      SELECT violation.id, 'invalid_expense_effect_or_reversal_pair'
      FROM expense_effect_violations violation
      UNION ALL
      SELECT violation.id, 'invalid_settlement_effect_or_reversal_pair'
      FROM payment_effect_violations violation
      UNION ALL
      SELECT (array_agg(event.id ORDER BY event.id))[1] AS entity_id, 'ledger_not_zero_sum'
      FROM financial_events event
      JOIN ledger_postings posting ON posting.financial_event_id = event.id
      GROUP BY event.ledger_id
      HAVING sum(posting.amount_minor) <> 0
    `,
  },
  {
    name: 'personal_and_lifecycle',
    sql: `
      WITH personal_ledger_counts AS (
        SELECT account.id, count(ledger.id) AS ledger_count
        FROM users account
        LEFT JOIN personal_ledgers ledger ON ledger.user_id = account.id
        GROUP BY account.id
      )
      SELECT ledger_count.id AS entity_id, 'user_does_not_have_exactly_one_personal_ledger' AS reason
      FROM personal_ledger_counts ledger_count
      WHERE ledger_count.ledger_count <> 1
      UNION ALL
      SELECT personal.id, 'invalid_personal_revision_chain'
      FROM personal_transactions personal
      LEFT JOIN personal_transactions previous ON previous.id = personal.replaces_personal_transaction_id
      WHERE (personal.version = 1 AND (
               personal.root_personal_transaction_id <> personal.id
               OR personal.replaces_personal_transaction_id IS NOT NULL
               OR personal.status <> 'ACTIVE'
             ))
         OR (personal.version > 1 AND (
               personal.root_personal_transaction_id = personal.id
               OR previous.id IS NULL
               OR previous.root_personal_transaction_id <> personal.root_personal_transaction_id
               OR previous.version + 1 <> personal.version
               OR previous.personal_ledger_id <> personal.personal_ledger_id
               OR previous.status <> 'ACTIVE'
             ))
      UNION ALL
      SELECT personal.id, 'invalid_personal_tombstone_snapshot'
      FROM personal_transactions personal
      JOIN personal_transactions previous ON previous.id = personal.replaces_personal_transaction_id
      WHERE personal.status = 'DELETED'
        AND (
          personal.type IS DISTINCT FROM previous.type
          OR personal.amount_minor IS DISTINCT FROM previous.amount_minor
          OR personal.category_id IS DISTINCT FROM previous.category_id
          OR personal.description IS DISTINCT FROM previous.description
          OR personal.merchant_or_source IS DISTINCT FROM previous.merchant_or_source
          OR personal.occurred_at IS DISTINCT FROM previous.occurred_at
          OR personal.notes IS DISTINCT FROM previous.notes
        )
      UNION ALL
      SELECT personal.id, 'invalid_personal_system_category'
      FROM personal_transactions personal
      LEFT JOIN categories category ON category.id = personal.category_id
      WHERE category.id IS NULL
         OR NOT category.is_system
         OR category.kind::text <> personal.type::text
         OR (personal.type = 'EXPENSE' AND category.code NOT IN (
           'FOOD_AND_DRINK', 'GROCERIES', 'TRANSPORT', 'ACCOMMODATION',
           'UTILITIES', 'ENTERTAINMENT', 'SHOPPING', 'HEALTHCARE', 'OTHER'
         ))
         OR (personal.type = 'INCOME' AND category.code NOT IN (
           'SALARY', 'FREELANCE', 'BUSINESS', 'GIFTS', 'REFUNDS', 'OTHER_INCOME'
         ))
      UNION ALL
      SELECT account.id, 'invalid_user_lifecycle_shape'
      FROM users account
      WHERE NOT (
        (account.status = 'ANONYMIZED'
          AND account.email IS NULL
          AND account.display_name = 'Deleted user'
          AND account.deleted_at IS NOT NULL)
        OR (account.status <> 'ANONYMIZED'
          AND account.email IS NOT NULL
          AND account.deleted_at IS NULL)
      )
      UNION ALL
      SELECT account.id, 'anonymized_user_not_fully_scrubbed'
      FROM users account
      WHERE account.status = 'ANONYMIZED'
        AND (
          account.timezone <> 'UTC'
          OR account.display_currency <> 'PKR'
          OR EXISTS (SELECT 1 FROM user_identities identity WHERE identity.user_id = account.id)
          OR EXISTS (SELECT 1 FROM device_tokens token WHERE token.user_id = account.id)
          OR EXISTS (SELECT 1 FROM user_preferences preference WHERE preference.user_id = account.id)
          OR EXISTS (SELECT 1 FROM notification_preferences preference WHERE preference.user_id = account.id)
          OR EXISTS (SELECT 1 FROM password_reset_tokens token WHERE token.user_id = account.id)
          OR EXISTS (SELECT 1 FROM notifications notification WHERE notification.recipient_user_id = account.id OR notification.actor_user_id = account.id)
          OR EXISTS (SELECT 1 FROM user_blocks block WHERE block.blocker_user_id = account.id OR block.blocked_user_id = account.id)
          OR EXISTS (SELECT 1 FROM idempotency_keys key WHERE key.user_id = account.id)
          OR EXISTS (
            SELECT 1 FROM outbox_events event
            WHERE event.event_type = 'auth.password_reset_requested'
              AND event.aggregate_id = account.id
          )
          OR EXISTS (
            SELECT 1 FROM refresh_sessions session
            WHERE session.user_id = account.id
              AND (
                session.revoked_at IS NULL
                OR session.token_hash NOT LIKE 'anonymized:%'
                OR session.device_id IS NOT NULL
                OR session.device_name IS NOT NULL
                OR session.device_platform IS NOT NULL
                OR session.user_agent IS NOT NULL
                OR session.ip_address IS NOT NULL
              )
          )
          OR EXISTS (
            SELECT 1 FROM connection_requests request
            WHERE request.status = 'PENDING'
              AND (request.sender_user_id = account.id OR request.receiver_user_id = account.id)
          )
          OR EXISTS (
            SELECT 1 FROM ledger_members member
            JOIN ledgers ledger ON ledger.id = member.ledger_id
            WHERE member.user_id = account.id
              AND (
                (ledger.type = 'GROUP' AND member.status IN ('INVITED', 'ACTIVE'))
                OR (ledger.type = 'DIRECT' AND ledger.status = 'ACTIVE')
              )
          )
          OR EXISTS (
            SELECT 1 FROM ledger_members invitation
            JOIN ledgers ledger ON ledger.id = invitation.ledger_id
            WHERE ledger.type = 'GROUP'
              AND invitation.status = 'INVITED'
              AND invitation.invited_by_user_id = account.id
          )
        )
    `,
  },
];

const unknownArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== '--json' && argument !== '--');
const jsonOutput = process.argv.includes('--json');

async function runCheck(
  client: PoolClient,
  check: Check,
): Promise<CheckResult> {
  const result = await client.query<{
    violation_count: number;
    samples: Sample[];
  }>(`
    WITH raw_violations AS (${check.sql}),
    ordered AS (
      SELECT entity_id,
             reason,
             row_number() OVER (ORDER BY reason, entity_id) AS sample_order
      FROM raw_violations
    )
    SELECT count(*)::integer AS violation_count,
           coalesce(
             json_agg(
               json_build_object('id', entity_id::text, 'reason', reason)
               ORDER BY reason, entity_id
             ) FILTER (WHERE sample_order <= 20),
             '[]'::json
           ) AS samples
    FROM ordered
  `);
  const row = result.rows[0];
  if (!row) {
    throw new Error(`Reconciliation check ${check.name} returned no summary.`);
  }
  return {
    name: check.name,
    violationCount: row.violation_count,
    samples: row.samples,
  };
}

async function main(): Promise<void> {
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown argument: ${unknownArguments[0]}`);
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const startedAt = performance.now();
  const pool = new Pool({
    connectionString,
    max: 1,
    application_name: 'hissab-reconcile',
  });
  let client: PoolClient | undefined;
  let transactionOpen = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transactionOpen = true;
    await client.query("SET LOCAL statement_timeout = '60s'");
    const timestamp = await client.query<{ checked_at: Date }>(
      'SELECT transaction_timestamp() AS checked_at',
    );
    const results: CheckResult[] = [];
    for (const check of checks) {
      try {
        results.push(await runCheck(client, check));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'query failed';
        throw new Error(`${check.name}: ${message}`);
      }
    }
    await client.query('ROLLBACK');
    transactionOpen = false;

    const violationCount = results.reduce(
      (total, result) => total + result.violationCount,
      0,
    );
    const failedCheckCount = results.filter(
      (result) => result.violationCount > 0,
    ).length;
    const output = {
      status: violationCount === 0 ? 'pass' : 'fail',
      checkedAt: timestamp.rows[0]?.checked_at.toISOString(),
      durationMs: Math.round(performance.now() - startedAt),
      violationCount,
      checks: results,
    };

    if (jsonOutput) {
      console.log(JSON.stringify(output));
    } else {
      for (const result of results) {
        console.log(
          `${result.violationCount === 0 ? 'PASS' : 'FAIL'} ${result.name} (${result.violationCount})`,
        );
        for (const sample of result.samples) {
          console.log(`  ${sample.id} ${sample.reason}`);
        }
      }
      console.log(
        violationCount === 0
          ? 'PASS no reconciliation violations'
          : `FAIL ${violationCount} violations across ${failedCheckCount}/${results.length} checks`,
      );
    }
    process.exitCode = violationCount === 0 ? 0 : 1;
  } finally {
    if (transactionOpen && client) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    client?.release();
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : 'Unknown reconciliation error.';
  if (jsonOutput) {
    console.error(JSON.stringify({ status: 'error', error: message }));
  } else {
    console.error(`ERROR ${message}`);
  }
  process.exitCode = 2;
});
