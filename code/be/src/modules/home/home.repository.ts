import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

interface PeopleCountRow {
  peopleCount: number;
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
}
