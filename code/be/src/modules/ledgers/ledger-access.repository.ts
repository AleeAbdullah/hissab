import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';

import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { ledgerMembers, ledgers } from '../../database/schema';

type Executor = AppDatabase | DatabaseTransaction;

export interface LockedLedger {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

// Membership and lifecycle checks shared by every module that reads or
// writes a shared ledger. Writes lock the ledger row for the transaction.
@Injectable()
export class LedgerAccessRepository {
  constructor(private readonly database: DatabaseService) {}

  async lockLedger(
    transaction: DatabaseTransaction,
    ledgerId: string,
  ): Promise<LockedLedger | undefined> {
    const [ledger] = await transaction
      .select({ id: ledgers.id, status: ledgers.status })
      .from(ledgers)
      .where(eq(ledgers.id, ledgerId))
      .limit(1)
      .for('update');
    return ledger;
  }

  async isActiveMember(
    executor: Executor,
    ledgerId: string,
    userId: string,
  ): Promise<boolean> {
    const [membership] = await executor
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.userId, userId),
          eq(ledgerMembers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    return Boolean(membership);
  }

  // A user who ever joined keeps read access to the ledger's history.
  async hasJoinedMembership(
    ledgerId: string,
    userId: string,
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

  async findActiveMemberIds(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }
    const rows = await transaction
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.status, 'ACTIVE'),
          inArray(ledgerMembers.userId, userIds),
        ),
      );
    return rows.map(({ userId }) => userId);
  }

  async requireJoinedMembership(
    ledgerId: string,
    userId: string,
  ): Promise<void> {
    if (!(await this.hasJoinedMembership(ledgerId, userId))) {
      throw new NotFoundException('Ledger not found.');
    }
  }

  async requireWritableLedger(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userId: string,
  ): Promise<void> {
    const ledger = await this.lockLedger(transaction, ledgerId);
    if (
      !ledger ||
      !(await this.isActiveMember(transaction, ledgerId, userId))
    ) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.status !== 'ACTIVE') {
      throw new ConflictException('Archived ledgers are read-only.');
    }
  }

  async requireActiveMembers(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userIds: string[],
    message: string,
  ): Promise<void> {
    const unique = [...new Set(userIds)].sort();
    const active = await this.findActiveMemberIds(
      transaction,
      ledgerId,
      unique,
    );
    if (active.length !== unique.length) {
      throw new BadRequestException(message);
    }
  }
}
