import { Injectable } from '@nestjs/common';
import { and, eq, isNotNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { ledgerMembers } from '../../database/schema';

export interface UserBalanceRow {
  ledgerId: string;
  ledgerType: 'DIRECT' | 'GROUP';
  ledgerStatus: 'ACTIVE' | 'ARCHIVED';
  netMinor: string;
}

export interface LedgerMemberBalanceRow {
  userId: string;
  displayName: string;
  netMinor: string;
  lastReminderAt: Date | null;
  reminderAvailableAt: Date | null;
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
        GROUP BY ledger.id, ledger.type, ledger.status
        ORDER BY ledger.id
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
    userId: string,
    ledgerId: string,
  ): Promise<LedgerMemberBalanceRow[]> {
    const result = await this.database.pool.query<LedgerMemberBalanceRow>(
      `
        WITH member_balances AS (
          SELECT
                 posting.user_id,
                 sum(posting.amount_minor) AS net_minor
          FROM financial_events event
          JOIN ledger_postings posting ON posting.financial_event_id = event.id
          WHERE event.ledger_id = $1::uuid
          GROUP BY posting.user_id
        ), latest_reminders AS (
          SELECT recipient_user_id,
                 max(created_at) AS last_reminder_at
          FROM reminder_requests
          WHERE ledger_id = $1::uuid
            AND EXISTS (
              SELECT 1
              FROM ledgers ledger
              JOIN ledger_members viewer
                ON viewer.ledger_id = ledger.id
              WHERE ledger.id = $1::uuid
                AND ledger.status = 'ACTIVE'
                AND viewer.user_id = $2::uuid
                AND viewer.status = 'ACTIVE'
            )
          GROUP BY recipient_user_id
        )
        SELECT member.user_id AS "userId",
               person.display_name AS "displayName",
               coalesce(balance.net_minor, 0)::text AS "netMinor",
               reminder.last_reminder_at AS "lastReminderAt",
               reminder.last_reminder_at + interval '24 hours' AS "reminderAvailableAt"
        FROM ledger_members member
        JOIN users person ON person.id = member.user_id
        LEFT JOIN member_balances balance
          ON balance.user_id = member.user_id
        LEFT JOIN latest_reminders reminder
          ON reminder.recipient_user_id = member.user_id
         AND member.status = 'ACTIVE'
        WHERE member.ledger_id = $1::uuid
          AND member.joined_at IS NOT NULL
        ORDER BY person.display_name, member.user_id
      `,
      [ledgerId, userId],
    );
    return result.rows;
  }
}
