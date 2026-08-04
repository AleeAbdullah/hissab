import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { ledgerMembers } from '../../database/schema';

export interface UserBalanceRow {
  ledgerId: string;
  ledgerType: 'DIRECT' | 'GROUP';
  ledgerStatus: 'ACTIVE' | 'ARCHIVED';
  currency: string;
  netMinor: string;
}

export interface LedgerMemberBalanceRow {
  currency: string;
  userId: string;
  displayName: string;
  netMinor: string;
}

@Injectable()
export class BalancesRepository {
  constructor(private readonly database: DatabaseService) {}

  async listUserBalances(userId: string): Promise<UserBalanceRow[]> {
    const result = await this.database.pool.query<UserBalanceRow>(
      `
        SELECT ledger.id AS "ledgerId",
               ledger.type AS "ledgerType",
               ledger.status AS "ledgerStatus",
               posting.currency,
               sum(
                 CASE WHEN posting.user_id = $1::uuid
                   THEN posting.amount_minor
                   ELSE 0
                 END
               )::text AS "netMinor"
        FROM ledger_members membership
        JOIN ledgers ledger ON ledger.id = membership.ledger_id
        JOIN financial_events event ON event.ledger_id = ledger.id
        JOIN ledger_postings posting ON posting.financial_event_id = event.id
        WHERE membership.user_id = $1::uuid
          AND membership.joined_at IS NOT NULL
        GROUP BY ledger.id, ledger.type, ledger.status, posting.currency
        ORDER BY posting.currency, ledger.id
      `,
      [userId],
    );
    return result.rows;
  }

  async hasJoinedMembership(
    userId: string,
    ledgerId: string,
  ): Promise<boolean> {
    const [membership] = await this.database.db
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.userId, userId),
          isNotNull(ledgerMembers.joinedAt),
        ),
      )
      .limit(1);
    return Boolean(membership);
  }

  async listLedgerBalances(
    ledgerId: string,
  ): Promise<LedgerMemberBalanceRow[]> {
    const result = await this.database.pool.query<LedgerMemberBalanceRow>(
      `
        WITH currencies AS (
          SELECT DISTINCT posting.currency
          FROM financial_events event
          JOIN ledger_postings posting ON posting.financial_event_id = event.id
          WHERE event.ledger_id = $1::uuid
        ), member_balances AS (
          SELECT posting.currency,
                 posting.user_id,
                 sum(posting.amount_minor) AS net_minor
          FROM financial_events event
          JOIN ledger_postings posting ON posting.financial_event_id = event.id
          WHERE event.ledger_id = $1::uuid
          GROUP BY posting.currency, posting.user_id
        )
        SELECT currency.currency,
               member.user_id AS "userId",
               person.display_name AS "displayName",
               coalesce(balance.net_minor, 0)::text AS "netMinor"
        FROM currencies currency
        CROSS JOIN ledger_members member
        JOIN users person ON person.id = member.user_id
        LEFT JOIN member_balances balance
          ON balance.currency = currency.currency
         AND balance.user_id = member.user_id
        WHERE member.ledger_id = $1::uuid
          AND member.joined_at IS NOT NULL
        ORDER BY currency.currency, person.display_name, member.user_id
      `,
      [ledgerId],
    );
    return result.rows;
  }
}
