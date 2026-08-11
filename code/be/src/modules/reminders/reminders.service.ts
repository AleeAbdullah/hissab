import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  financialEvents,
  ledgerMembers,
  ledgerPostings,
  ledgers,
  reminderRequests,
} from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import type { CreateReminderDto } from './dto/create-reminder.dto';

const COOLDOWN_MS = 24 * 60 * 60 * 1_000;
const MAX_MINOR = 9_223_372_036_854_775_807n;

type ReminderRow = typeof reminderRequests.$inferSelect;

export interface ReminderView {
  id: string;
  ledgerId: string;
  requesterUserId: string;
  recipientUserId: string;
  owedMinor: string;
  createdAt: Date;
}

@Injectable()
export class RemindersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  createReminder(
    requesterUserId: string,
    ledgerId: string,
    idempotencyKey: string,
    dto: CreateReminderDto,
  ): Promise<ReminderView> {
    const recipientUserId = dto.recipientUserId.toLowerCase();
    if (requesterUserId === recipientUserId) {
      throw new BadRequestException('Reminder recipient must be another user.');
    }
    return this.idempotency.execute(
      {
        actor: {
          kind: 'user',
          subject: requesterUserId,
          userId: requesterUserId,
        },
        key: idempotencyKey,
        request: { ledgerId, recipientUserId },
        responseStatus: 201,
        routeScope: 'reminders:create',
        authorizeReplay: (transaction) =>
          this.requireActiveRequester(transaction, ledgerId, requesterUserId),
      },
      async (transaction) => {
        await this.lockCooldown(
          transaction,
          ledgerId,
          requesterUserId,
          recipientUserId,
        );
        await this.requireActiveLedgerMembers(
          transaction,
          ledgerId,
          requesterUserId,
          recipientUserId,
        );
        await this.requireCooldownElapsed(
          transaction,
          ledgerId,
          requesterUserId,
          recipientUserId,
        );
        const balances = await this.findBalances(
          transaction,
          ledgerId,
          requesterUserId,
          recipientUserId,
        );
        const requesterBalance = BigInt(balances.get(requesterUserId) ?? '0');
        const recipientBalance = BigInt(balances.get(recipientUserId) ?? '0');
        if (requesterBalance <= 0n || recipientBalance >= 0n) {
          throw new ConflictException(
            'Reminder requires the requester to be owed and the recipient to owe in this ledger.',
          );
        }
        const owedMinor = -recipientBalance;
        if (owedMinor > MAX_MINOR) {
          throw new ConflictException(
            'Recipient balance exceeds the supported minor-unit range.',
          );
        }
        const [reminder] = await transaction
          .insert(reminderRequests)
          .values({
            ledgerId,
            requesterUserId,
            recipientUserId,
            owedMinor,
          })
          .returning();
        if (!reminder) {
          throw new Error('Reminder insert returned no row.');
        }
        await this.outbox.enqueue(transaction, {
          eventType: 'reminder.created',
          aggregateType: 'reminder',
          aggregateId: reminder.id,
          payload: {
            actorUserId: requesterUserId,
            requesterUserId,
            recipientUserId,
            ledgerId,
            owedMinor: owedMinor.toString(),
          },
        });
        return this.toView(reminder);
      },
    );
  }

  private async lockCooldown(
    transaction: DatabaseTransaction,
    ledgerId: string,
    requesterUserId: string,
    recipientUserId: string,
  ): Promise<void> {
    const key = `${ledgerId}:${requesterUserId}:${recipientUserId}`;
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`,
    );
  }

  private async requireActiveLedgerMembers(
    transaction: DatabaseTransaction,
    ledgerId: string,
    requesterUserId: string,
    recipientUserId: string,
  ): Promise<void> {
    const [ledger] = await transaction
      .select({ id: ledgers.id, status: ledgers.status })
      .from(ledgers)
      .where(eq(ledgers.id, ledgerId))
      .limit(1)
      .for('update');
    if (!ledger) {
      throw new NotFoundException('Ledger not found.');
    }
    const members = await transaction
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.status, 'ACTIVE'),
          inArray(ledgerMembers.userId, [requesterUserId, recipientUserId]),
        ),
      );
    if (!members.some(({ userId }) => userId === requesterUserId)) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.status !== 'ACTIVE') {
      throw new ConflictException('Archived ledgers are read-only.');
    }
    if (!members.some(({ userId }) => userId === recipientUserId)) {
      throw new BadRequestException(
        'Reminder recipient must be an active ledger member.',
      );
    }
  }

  private async requireActiveRequester(
    transaction: DatabaseTransaction,
    ledgerId: string,
    requesterUserId: string,
  ): Promise<void> {
    const [membership] = await transaction
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .innerJoin(ledgers, eq(ledgers.id, ledgerMembers.ledgerId))
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.userId, requesterUserId),
          eq(ledgerMembers.status, 'ACTIVE'),
          eq(ledgers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    if (!membership) {
      throw new NotFoundException('Ledger not found.');
    }
  }

  private async requireCooldownElapsed(
    transaction: DatabaseTransaction,
    ledgerId: string,
    requesterUserId: string,
    recipientUserId: string,
  ): Promise<void> {
    const [latest] = await transaction
      .select({ createdAt: reminderRequests.createdAt })
      .from(reminderRequests)
      .where(
        and(
          eq(reminderRequests.ledgerId, ledgerId),
          eq(reminderRequests.requesterUserId, requesterUserId),
          eq(reminderRequests.recipientUserId, recipientUserId),
        ),
      )
      .orderBy(desc(reminderRequests.createdAt))
      .limit(1);
    if (!latest) {
      return;
    }
    const retryAt = new Date(latest.createdAt.getTime() + COOLDOWN_MS);
    if (retryAt.getTime() > Date.now()) {
      throw new HttpException(
        {
          code: 'REMINDER_COOLDOWN',
          message: 'A reminder was already sent during the cooldown period.',
          details: { retryAt: retryAt.toISOString() },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async findBalances(
    transaction: DatabaseTransaction,
    ledgerId: string,
    requesterUserId: string,
    recipientUserId: string,
  ): Promise<Map<string, string>> {
    const rows = await transaction
      .select({
        userId: ledgerPostings.userId,
        netMinor: sql<string>`sum(${ledgerPostings.amountMinor})::text`,
      })
      .from(financialEvents)
      .innerJoin(
        ledgerPostings,
        eq(ledgerPostings.financialEventId, financialEvents.id),
      )
      .where(
        and(
          eq(financialEvents.ledgerId, ledgerId),
          inArray(ledgerPostings.userId, [requesterUserId, recipientUserId]),
        ),
      )
      .groupBy(ledgerPostings.userId);
    return new Map(rows.map((row) => [row.userId, row.netMinor]));
  }

  private toView(reminder: ReminderRow): ReminderView {
    return {
      id: reminder.id,
      ledgerId: reminder.ledgerId,
      requesterUserId: reminder.requesterUserId,
      recipientUserId: reminder.recipientUserId,
      owedMinor: reminder.owedMinor.toString(),
      createdAt: reminder.createdAt,
    };
  }
}
