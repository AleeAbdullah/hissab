import assert from 'node:assert/strict';

import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query("SET TIME ZONE 'Asia/Karachi'");
  const { rows } = await client.query(`
    SELECT to_char('2026-10-01T00:30:00+05:00'::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
           to_char('2026-10-01T00:30:00+05:00'::timestamptz AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
           EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_name = 'users' AND column_name = 'timezone'
           ) AS has_timezone
  `);
  assert.deepEqual(rows[0], {
    day: '2026-09-30',
    month: '2026-09',
    has_timezone: false,
  });
  console.log('UTC calendar boundary and schema check passed.');
} finally {
  await client.end();
}
