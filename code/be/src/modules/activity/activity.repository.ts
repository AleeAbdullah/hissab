import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

export interface ActivityCursor {
  createdAt: string;
  id: string;
}

export interface ActivityRow {
  id: string;
  actorUserId: string | null;
  ledgerId: string | null;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  cursorCreatedAt: string;
  actorDisplayName: string | null;
  ledgerType: 'DIRECT' | 'GROUP' | null;
  ledgerStatus: 'ACTIVE' | 'ARCHIVED' | null;
  groupName: string | null;
  directLowUserId: string | null;
  directHighUserId: string | null;
  directLowDisplayName: string | null;
  directHighDisplayName: string | null;
  requestSenderUserId: string | null;
  requestReceiverUserId: string | null;
  requestSenderDisplayName: string | null;
  requestReceiverDisplayName: string | null;
  targetDisplayName: string | null;
  subjectUserId: string | null;
  subjectDisplayName: string | null;
  expenseVersion: number | null;
  expenseTotalMinor: string | null;
  expenseDescription: string | null;
  expenseCategoryCode: string | null;
  expenseCategoryName: string | null;
  expenseOccurredAt: Date | null;
  settlementVersion: number | null;
  settlementAmountMinor: string | null;
  settlementFromUserId: string | null;
  settlementFromDisplayName: string | null;
  settlementToUserId: string | null;
  settlementToDisplayName: string | null;
  settlementOccurredAt: Date | null;
}

const CONNECTION_REQUEST_EVENTS = [
  'CONNECTION_CREATED',
  'CONNECTION_ACCEPTED',
  'CONNECTION_DECLINED',
  'CONNECTION_CANCELLED',
];
const BLOCK_EVENTS = ['CONNECTION_USER_BLOCKED', 'CONNECTION_USER_UNBLOCKED'];

@Injectable()
export class ActivityRepository {
  constructor(private readonly database: DatabaseService) {}

  async list(
    userId: string,
    eventTypes: readonly string[],
    ledgerId: string | null,
    cursor: ActivityCursor | null,
    limit: number,
  ): Promise<ActivityRow[]> {
    const result = await this.database.pool.query<ActivityRow>(
      `
        SELECT activity.id,
               activity.actor_user_id AS "actorUserId",
               activity.ledger_id AS "ledgerId",
               activity.event_type AS "eventType",
               activity.aggregate_id AS "aggregateId",
               activity.payload,
               activity.created_at AS "createdAt",
               to_char(
                 activity.created_at AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
               ) AS "cursorCreatedAt",
               actor.display_name AS "actorDisplayName",
               ledger.type AS "ledgerType",
               ledger.status AS "ledgerStatus",
               profile.name AS "groupName",
               ledger.direct_low_user_id AS "directLowUserId",
               ledger.direct_high_user_id AS "directHighUserId",
               direct_low.display_name AS "directLowDisplayName",
               direct_high.display_name AS "directHighDisplayName",
               request.sender_user_id AS "requestSenderUserId",
               request.receiver_user_id AS "requestReceiverUserId",
               request_sender.display_name AS "requestSenderDisplayName",
               request_receiver.display_name AS "requestReceiverDisplayName",
               target.display_name AS "targetDisplayName",
               subject.id AS "subjectUserId",
               subject.display_name AS "subjectDisplayName",
               expense.version AS "expenseVersion",
               expense.total_minor::text AS "expenseTotalMinor",
               expense.description AS "expenseDescription",
               expense_category.code AS "expenseCategoryCode",
               expense_category.name AS "expenseCategoryName",
               expense.occurred_at AS "expenseOccurredAt",
               settlement.version AS "settlementVersion",
               settlement.amount_minor::text AS "settlementAmountMinor",
               settlement.from_user_id AS "settlementFromUserId",
               settlement_from.display_name AS "settlementFromDisplayName",
               settlement.to_user_id AS "settlementToUserId",
               settlement_to.display_name AS "settlementToDisplayName",
               settlement.occurred_at AS "settlementOccurredAt"
        FROM activity_events activity
        LEFT JOIN users actor ON actor.id = activity.actor_user_id
        LEFT JOIN ledgers ledger ON ledger.id = activity.ledger_id
        LEFT JOIN group_profiles profile ON profile.ledger_id = ledger.id
        LEFT JOIN users direct_low ON direct_low.id = ledger.direct_low_user_id
        LEFT JOIN users direct_high ON direct_high.id = ledger.direct_high_user_id
        LEFT JOIN connection_requests request
          ON request.id = activity.aggregate_id
         AND activity.event_type = ANY($3::text[])
        LEFT JOIN users request_sender ON request_sender.id = request.sender_user_id
        LEFT JOIN users request_receiver ON request_receiver.id = request.receiver_user_id
        LEFT JOIN users target
          ON target.id = activity.aggregate_id
         AND activity.event_type = ANY($4::text[])
        LEFT JOIN users subject
          ON subject.id::text = coalesce(
            activity.payload->>'invitedUserId',
            activity.payload->>'userId'
          )
        LEFT JOIN expenses expense
          ON expense.root_expense_id = activity.aggregate_id
         AND expense.version::text = activity.payload->>'version'
         AND activity.event_type LIKE 'EXPENSE\\_%' ESCAPE '\\'
        LEFT JOIN categories expense_category ON expense_category.id = expense.category_id
        LEFT JOIN payments settlement
          ON settlement.root_payment_id = activity.aggregate_id
         AND settlement.version::text = activity.payload->>'version'
         AND activity.event_type LIKE 'SETTLEMENT\\_%' ESCAPE '\\'
        LEFT JOIN users settlement_from ON settlement_from.id = settlement.from_user_id
        LEFT JOIN users settlement_to ON settlement_to.id = settlement.to_user_id
        WHERE activity.event_type = ANY($2::text[])
          AND (
            (
              activity.ledger_id IS NOT NULL
              AND EXISTS (
                SELECT 1
                FROM ledger_members member
                WHERE member.ledger_id = activity.ledger_id
                  AND member.user_id = $1::uuid
                  AND member.joined_at IS NOT NULL
              )
            )
            OR (
              activity.event_type = ANY($3::text[])
              AND $1::uuid IN (request.sender_user_id, request.receiver_user_id)
            )
            OR (
              activity.event_type = ANY($4::text[])
              AND activity.actor_user_id = $1::uuid
            )
          )
          AND ($5::uuid IS NULL OR activity.ledger_id = $5::uuid)
          AND (
            $6::timestamptz IS NULL
            OR (activity.created_at, activity.id) < ($6::timestamptz, $7::uuid)
          )
        ORDER BY activity.created_at DESC, activity.id DESC
        LIMIT $8
      `,
      [
        userId,
        eventTypes,
        CONNECTION_REQUEST_EVENTS,
        BLOCK_EVENTS,
        ledgerId,
        cursor?.createdAt ?? null,
        cursor?.id ?? null,
        limit,
      ],
    );
    return result.rows;
  }
}
