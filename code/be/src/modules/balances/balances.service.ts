import { Injectable, NotFoundException } from '@nestjs/common';

import {
  BalancesRepository,
  type LedgerMemberBalanceRow,
  type UserBalanceRow,
} from './balances.repository';

export interface UserBalancesView {
  currencies: Array<{
    currency: string;
    totalNetMinor: string;
    ledgers: Array<{
      ledgerId: string;
      ledgerType: 'DIRECT' | 'GROUP';
      ledgerStatus: 'ACTIVE' | 'ARCHIVED';
      netMinor: string;
    }>;
  }>;
}

export interface LedgerBalancesView {
  ledgerId: string;
  currencies: Array<{
    currency: string;
    members: Array<{
      userId: string;
      displayName: string;
      netMinor: string;
    }>;
  }>;
}

@Injectable()
export class BalancesService {
  constructor(private readonly repository: BalancesRepository) {}

  async listUserBalances(userId: string): Promise<UserBalancesView> {
    const rows = await this.repository.listUserBalances(userId);
    return { currencies: this.groupUserBalances(rows) };
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
      currencies: this.groupLedgerBalances(
        await this.repository.listLedgerBalances(ledgerId),
      ),
    };
  }

  private groupUserBalances(rows: UserBalanceRow[]) {
    const currencies = new Map<
      string,
      UserBalancesView['currencies'][number]
    >();
    for (const row of rows) {
      const currency = currencies.get(row.currency) ?? {
        currency: row.currency,
        totalNetMinor: '0',
        ledgers: [],
      };
      currency.totalNetMinor = (
        BigInt(currency.totalNetMinor) + BigInt(row.netMinor)
      ).toString();
      currency.ledgers.push({
        ledgerId: row.ledgerId,
        ledgerType: row.ledgerType,
        ledgerStatus: row.ledgerStatus,
        netMinor: row.netMinor,
      });
      currencies.set(row.currency, currency);
    }
    return [...currencies.values()];
  }

  private groupLedgerBalances(rows: LedgerMemberBalanceRow[]) {
    const currencies = new Map<
      string,
      LedgerBalancesView['currencies'][number]
    >();
    for (const row of rows) {
      const currency = currencies.get(row.currency) ?? {
        currency: row.currency,
        members: [],
      };
      currency.members.push({
        userId: row.userId,
        displayName: row.displayName,
        netMinor: row.netMinor,
      });
      currencies.set(row.currency, currency);
    }
    return [...currencies.values()];
  }
}
