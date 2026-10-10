import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

import { config } from 'dotenv';
import pg from 'pg';

config({ path: new URL('../.env', import.meta.url) });
const require = createRequire(import.meta.url);
const {
  PersonalRepository,
} = require('../dist/modules/personal/personal.repository.js');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    'select user_id AS id from expense_splits limit 1',
  );
  const userId =
    rows[0]?.id ??
    (await client.query('select id from users limit 1')).rows[0]?.id ??
    '00000000-0000-4000-8000-000000000000';
  const repository = new PersonalRepository({ pool: client });
  const filters = { from: null, to: null };
  const personal = await repository.listHistory(
    userId,
    filters,
    false,
    'MONTH',
    null,
    2,
  );
  const shared = await repository.listHistory(
    userId,
    filters,
    true,
    'MONTH',
    null,
    2,
  );
  assert(personal.items.every((item) => item.kind === 'PERSONAL'));
  assert.equal(personal.incomeMinor, shared.incomeMinor);
  assert(BigInt(shared.expenseMinor) >= BigInt(personal.expenseMinor));
  assert.equal(
    BigInt(shared.incomeMinor) - BigInt(shared.expenseMinor),
    BigInt(shared.netMinor),
  );
  const reportExpense = async (includeShared) =>
    (
      await repository.listReportBuckets(
        userId,
        filters,
        includeShared,
        'MONTH',
      )
    )
      .filter((row) => row.type === 'EXPENSE')
      .reduce((sum, row) => sum + BigInt(row.amountMinor), 0n)
      .toString();
  assert.equal(shared.expenseMinor, await reportExpense(true));
  assert.equal(personal.expenseMinor, await reportExpense(false));
  assert(
    shared.items.every(
      (item) =>
        item.kind === 'PERSONAL' ||
        item.amountMinor === (item.owedMinor ?? '0'),
    ),
  );
  if (shared.items.length > 1) {
    const first = shared.items[0];
    const next = await repository.listHistory(
      userId,
      filters,
      true,
      'MONTH',
      { occurredAt: new Date(first.occurredAt), rootId: first.id },
      2,
    );
    assert.notEqual(next.items[0]?.id, first.id);
  }
} finally {
  await client.end();
}
