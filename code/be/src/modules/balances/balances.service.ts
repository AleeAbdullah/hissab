import { Injectable, NotFoundException } from '@nestjs/common';

import { BalancesRepository, type UserBalanceRow } from './balances.repository';

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
  }>;
}

@Injectable()
export class BalancesService {
  constructor(private readonly repository: BalancesRepository) {}

  async listUserBalances(userId: string): Promise<UserBalancesView> {
    const rows = await this.repository.listUserBalances(userId);
    return this.groupUserBalances(rows);
  }

  async listLedgerBalances(
    userId: string,
    ledgerId: string,
  ): Promise<LedgerBalancesView> {
    if (!(await this.repository.hasJoinedMembership(userId, ledgerId))) {
      throw new NotFoundException('Ledger not found.');
    }
    return {
      ledgerId,
      members: await this.repository.listLedgerBalances(ledgerId),
    };
  }

  private groupUserBalances(rows: UserBalanceRow[]): UserBalancesView {
    const ledgers = rows.map((row) => ({
      ledgerId: row.ledgerId,
      ledgerType: row.ledgerType,
      ledgerStatus: row.ledgerStatus,
      netMinor: row.netMinor,
    }));
    return {
      totalNetMinor: rows
        .reduce((total, row) => total + BigInt(row.netMinor), 0n)
        .toString(),
      ledgers,
    };
  }
}
