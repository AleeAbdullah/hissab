import { Injectable } from '@nestjs/common';

import { LedgerAccessRepository } from '../ledgers';
import { BalancesRepository } from './balances.repository';

export interface UserBalancesView {
  totalNetMinor: string;
  ledgers: Array<{
    ledgerId: string;
    ledgerType: 'DIRECT' | 'GROUP';
    ledgerStatus: 'ACTIVE' | 'ARCHIVED';
    netMinor: string;
  }>;
}

export interface LedgerBalancesView {
  ledgerId: string;
  members: Array<{
    userId: string;
    displayName: string;
    netMinor: string;
    lastReminderAt: Date | null;
    reminderAvailableAt: Date | null;
  }>;
}

@Injectable()
export class BalancesService {
  constructor(
    private readonly repository: BalancesRepository,
    private readonly ledgers: LedgerAccessRepository,
  ) {}

  async listUserBalances(userId: string): Promise<UserBalancesView> {
    const ledgers = await this.repository.listUserBalances(userId);
    return {
      totalNetMinor: ledgers
        .reduce((total, ledger) => total + BigInt(ledger.netMinor), 0n)
        .toString(),
      ledgers,
    };
  }

  async listLedgerBalances(
    userId: string,
    ledgerId: string,
  ): Promise<LedgerBalancesView> {
    await this.ledgers.requireJoinedMembership(ledgerId, userId);
    return {
      ledgerId,
      members: await this.repository.listLedgerBalances(userId, ledgerId),
    };
  }
}
