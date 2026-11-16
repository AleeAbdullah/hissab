import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

interface PeopleCountRow {
  peopleCount: number;
}

interface ShareRow {
  rootExpenseId: string;
  version: number;
  shareMinor: string;
}

@Injectable()
export class HomeRepository {
  constructor(private readonly database: DatabaseService) {}

  async countPeopleInUnsettledLedgers(userId: string): Promise<number> {
    const result = await this.database.pool.query<PeopleCountRow>(
      `
        WITH unsettled_ledgers AS (
          SELECT event.ledger_id
          FROM ledger_members membership
          JOIN financial_events event ON event.ledger_id = membership.ledger_id
          JOIN ledger_postings posting ON posting.financial_event_id = event.id
          WHERE membership.user_id = $1::uuid
            AND membership.joined_at IS NOT NULL
          GROUP BY event.ledger_id
          HAVING sum(
            CASE WHEN posting.user_id = $1::uuid THEN posting.amount_minor ELSE 0 END
          ) <> 0
        )
        SELECT count(DISTINCT member.user_id)::int AS "peopleCount"
        FROM unsettled_ledgers unsettled
        JOIN ledger_members member ON member.ledger_id = unsettled.ledger_id
        WHERE member.user_id <> $1::uuid
          AND member.status = 'ACTIVE'
          AND member.joined_at IS NOT NULL
      `,
      [userId],
    );
    return result.rows[0]?.peopleCount ?? 0;
  }

  // Keyed by `${rootExpenseId}:${version}`; revisions without the user in the split map to '0'.
  async listOwnShares(
    userId: string,
    revisions: { rootExpenseId: string; version: number }[],
  ): Promise<Map<string, string>> {
    if (!revisions.length) return new Map();
    const result = await this.database.pool.query<ShareRow>(
      `
        SELECT expense.root_expense_id AS "rootExpenseId",
               expense.version,
               COALESCE(split.owed_minor, 0)::text AS "shareMinor"
        FROM expenses expense
        JOIN unnest($2::uuid[], $3::int[]) AS wanted(root_id, version)
          ON wanted.root_id = expense.root_expense_id
         AND wanted.version = expense.version
        LEFT JOIN expense_splits split
          ON split.expense_id = expense.id AND split.user_id = $1::uuid
      `,
      [
        userId,
        revisions.map((revision) => revision.rootExpenseId),
        revisions.map((revision) => revision.version),
      ],
    );
    return new Map(
      result.rows.map((row) => [
        `${row.rootExpenseId}:${row.version}`,
        row.shareMinor,
      ]),
    );
  }
}
