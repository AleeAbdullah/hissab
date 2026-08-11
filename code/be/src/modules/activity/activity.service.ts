import { BadRequestException, Injectable } from '@nestjs/common';

import {
  ActivityRepository,
  type ActivityCursor,
  type ActivityRow,
} from './activity.repository';
import {
  ACTIVITY_EVENT_TYPES,
  type ActivityArea,
  type ActivityItemDto,
  type ActivityPageDto,
  type ActivityUserDto,
  type ConnectionActivityDetailsDto,
  type ExpenseActivityDetailsDto,
  type GroupActivityDetailsDto,
  type ListActivityDto,
  type SettlementActivityDetailsDto,
} from './dto/activity.dto';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CONNECTION_STATUS: Record<
  string,
  ConnectionActivityDetailsDto['status']
> = {
  CONNECTION_CREATED: 'PENDING',
  CONNECTION_ACCEPTED: 'ACCEPTED',
  CONNECTION_DECLINED: 'DECLINED',
  CONNECTION_CANCELLED: 'CANCELLED',
  CONNECTION_USER_BLOCKED: 'BLOCKED',
  CONNECTION_USER_UNBLOCKED: 'UNBLOCKED',
};

@Injectable()
export class ActivityService {
  constructor(private readonly repository: ActivityRepository) {}

  async list(userId: string, query: ListActivityDto): Promise<ActivityPageDto> {
    const limit = query.limit ?? 50;
    const eventTypes = query.area
      ? ACTIVITY_EVENT_TYPES[query.area]
      : Object.values(ACTIVITY_EVENT_TYPES).flat();
    const rows = await this.repository.list(
      userId,
      eventTypes,
      query.ledgerId ?? null,
      query.cursor ? this.decodeCursor(query.cursor) : null,
      limit + 1,
    );
    const items = rows.slice(0, limit).map((row) => this.toItem(userId, row));
    return {
      items,
      nextCursor:
        rows.length > limit && rows.length > 1
          ? this.encodeCursor(rows[limit - 1])
          : null,
    };
  }

  private toItem(userId: string, row: ActivityRow): ActivityItemDto {
    const area = row.eventType.slice(
      0,
      row.eventType.indexOf('_'),
    ) as ActivityArea;
    return {
      id: row.id,
      area,
      eventType: row.eventType,
      aggregateId: row.aggregateId,
      actor:
        row.actorUserId && row.actorDisplayName
          ? { userId: row.actorUserId, displayName: row.actorDisplayName }
          : null,
      ledger: this.ledger(userId, row),
      counterparty: this.counterparty(userId, row),
      details: this.details(area, row),
      createdAt: row.createdAt,
    };
  }

  private ledger(userId: string, row: ActivityRow) {
    if (!row.ledgerId || !row.ledgerType || !row.ledgerStatus) {
      return null;
    }
    const name =
      row.ledgerType === 'GROUP'
        ? row.groupName
        : row.directLowUserId === userId
          ? row.directHighDisplayName
          : row.directLowDisplayName;
    return name
      ? {
          id: row.ledgerId,
          type: row.ledgerType,
          status: row.ledgerStatus,
          name,
        }
      : null;
  }

  private counterparty(
    userId: string,
    row: ActivityRow,
  ): ActivityUserDto | null {
    if (row.eventType.startsWith('CONNECTION_USER_')) {
      return row.targetDisplayName
        ? { userId: row.aggregateId, displayName: row.targetDisplayName }
        : null;
    }
    if (row.requestSenderUserId === userId) {
      return row.requestReceiverUserId && row.requestReceiverDisplayName
        ? {
            userId: row.requestReceiverUserId,
            displayName: row.requestReceiverDisplayName,
          }
        : null;
    }
    return row.requestSenderUserId && row.requestSenderDisplayName
      ? {
          userId: row.requestSenderUserId,
          displayName: row.requestSenderDisplayName,
        }
      : null;
  }

  private details(
    area: ActivityArea,
    row: ActivityRow,
  ):
    | ExpenseActivityDetailsDto
    | SettlementActivityDetailsDto
    | GroupActivityDetailsDto
    | ConnectionActivityDetailsDto {
    switch (area) {
      case 'EXPENSE':
        return this.expenseDetails(row);
      case 'SETTLEMENT':
        return this.settlementDetails(row);
      case 'GROUP':
        return this.groupDetails(row);
      case 'CONNECTION':
        return this.connectionDetails(row);
    }
  }

  private expenseDetails(row: ActivityRow): ExpenseActivityDetailsDto {
    return {
      version: this.requirePositiveInteger(row.expenseVersion),
      totalMinor: this.requirePositiveMinor(row.expenseTotalMinor),
      description: this.requireString(row.expenseDescription),
      category: {
        code: this.requireString(row.expenseCategoryCode),
        name: this.requireString(row.expenseCategoryName),
      },
      occurredAt: this.requireDate(row.expenseOccurredAt),
    };
  }

  private settlementDetails(row: ActivityRow): SettlementActivityDetailsDto {
    return {
      version: this.requirePositiveInteger(row.settlementVersion),
      amountMinor: this.requirePositiveMinor(row.settlementAmountMinor),
      from: {
        userId: this.requireUuid(row.settlementFromUserId),
        displayName: this.requireString(row.settlementFromDisplayName),
      },
      to: {
        userId: this.requireUuid(row.settlementToUserId),
        displayName: this.requireString(row.settlementToDisplayName),
      },
      occurredAt: this.requireDate(row.settlementOccurredAt),
    };
  }

  private groupDetails(row: ActivityRow): GroupActivityDetailsDto {
    const name = this.payloadString(row.payload, 'name');
    const reason = this.payloadString(row.payload, 'reason');
    return {
      ...(name ? { name } : {}),
      ...(row.subjectUserId && row.subjectDisplayName
        ? {
            subjectUser: {
              userId: row.subjectUserId,
              displayName: row.subjectDisplayName,
            },
          }
        : {}),
      ...(reason === 'LAST_MEMBER_LEFT' ? { reason } : {}),
    };
  }

  private connectionDetails(row: ActivityRow): ConnectionActivityDetailsDto {
    const ledgerId = this.payloadString(row.payload, 'ledgerId');
    return {
      status: CONNECTION_STATUS[row.eventType],
      ...(ledgerId && UUID_PATTERN.test(ledgerId) ? { ledgerId } : {}),
    };
  }

  private payloadString(
    payload: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private requirePositiveInteger(value: number | null): number {
    if (!Number.isInteger(value) || value === null || value < 1) {
      throw new Error('Invalid financial activity snapshot.');
    }
    return value;
  }

  private requirePositiveMinor(value: string | null): string {
    if (!value || !/^[1-9][0-9]*$/.test(value)) {
      throw new Error('Invalid financial activity snapshot.');
    }
    return value;
  }

  private requireString(value: string | null): string {
    if (!value) {
      throw new Error('Invalid financial activity snapshot.');
    }
    return value;
  }

  private requireUuid(value: string | null): string {
    if (!value || !UUID_PATTERN.test(value)) {
      throw new Error('Invalid financial activity snapshot.');
    }
    return value;
  }

  private requireDate(value: Date | null): Date {
    if (!value || Number.isNaN(value.getTime())) {
      throw new Error('Invalid financial activity snapshot.');
    }
    return value;
  }

  private encodeCursor(row: ActivityRow): string {
    return Buffer.from(JSON.stringify([row.cursorCreatedAt, row.id])).toString(
      'base64url',
    );
  }

  private decodeCursor(cursor: string): ActivityCursor {
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 2 ||
        typeof parsed[0] !== 'string' ||
        typeof parsed[1] !== 'string' ||
        !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(
          parsed[0],
        ) ||
        !UUID_PATTERN.test(parsed[1])
      ) {
        throw new Error('invalid cursor');
      }
      const createdAt = new Date(parsed[0]);
      const millisecondTimestamp = parsed[0].replace(/(\.\d{3})\d{3}Z$/, '$1Z');
      if (
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toISOString() !== millisecondTimestamp
      ) {
        throw new Error('invalid cursor date');
      }
      return { createdAt: parsed[0], id: parsed[1].toLowerCase() };
    } catch {
      throw new BadRequestException('Invalid activity cursor.');
    }
  }
}
