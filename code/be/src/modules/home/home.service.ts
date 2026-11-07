import { Injectable } from '@nestjs/common';

import { ActivityService } from '../activity/activity.service';
import type {
  ActivityItemDto,
  ExpenseActivityDetailsDto,
  SettlementActivityDetailsDto,
} from '../activity/dto/activity.dto';
import { BalancesService } from '../balances/balances.service';
import { PersonalService } from '../personal/personal.service';
import type { PersonalTransactionView } from '../personal/personal.repository';
import { UsersService } from '../users/users.service';
import type { HomeDto, HomeRecentItemDto } from './home.dto';
import { HomeRepository } from './home.repository';

@Injectable()
export class HomeService {
  constructor(
    private readonly activity: ActivityService,
    private readonly balances: BalancesService,
    private readonly personal: PersonalService,
    private readonly users: UsersService,
    private readonly repository: HomeRepository,
  ) {}

  async getHome(userId: string): Promise<HomeDto> {
    const [
      profile,
      balances,
      report,
      personalTransactions,
      expenseActivity,
      settlementActivity,
      peopleCount,
    ] = await Promise.all([
      this.users.getProfile(userId),
      this.balances.listUserBalances(userId),
      this.personal.getReport(userId, { bucket: 'MONTH' }),
      this.personal.listTransactions(userId, { limit: 5 }),
      this.activity.list(userId, { area: 'EXPENSE', limit: 5 }),
      this.activity.list(userId, { area: 'SETTLEMENT', limit: 5 }),
      this.repository.countPeopleInUnsettledLedgers(userId),
    ]);

    const month = new Date().toISOString().slice(0, 7);
    const monthNetMinor =
      report.buckets.find((bucket) => bucket.period === month)?.netMinor ?? '0';
    const recent = [
      ...personalTransactions.items
        .filter((item) => item.status === 'ACTIVE')
        .map((item) => this.personalItem(item)),
      ...expenseActivity.items.map((item) => this.sharedItem(item)),
      ...settlementActivity.items.map((item) => this.sharedItem(item)),
    ]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 5);

    return {
      currency: profile.displayCurrency,
      personal: { monthNetMinor },
      shared: {
        totalNetMinor: balances.totalNetMinor,
        unsettledLedgerCount: balances.ledgers.filter(
          (ledger) => ledger.netMinor !== '0',
        ).length,
        peopleCount,
      },
      recent,
    };
  }

  private personalItem(item: PersonalTransactionView): HomeRecentItemDto {
    return {
      kind: item.type === 'INCOME' ? 'PERSONAL_INCOME' : 'PERSONAL_EXPENSE',
      id: item.id,
      amountMinor: item.amountMinor,
      ledger: null,
      actor: null,
      category: item.category,
      description: item.description,
      from: null,
      to: null,
      occurredAt: item.occurredAt,
      createdAt: item.createdAt,
    };
  }

  // Home only lists expense and settlement activity, whose details are
  // financial snapshots; the activity service guarantees their shape.
  private sharedItem(item: ActivityItemDto): HomeRecentItemDto {
    const base = {
      id: item.aggregateId,
      ledger: item.ledger
        ? { id: item.ledger.id, type: item.ledger.type, name: item.ledger.name }
        : null,
      actor: item.actor,
      createdAt: item.createdAt,
    };
    if (item.area === 'EXPENSE') {
      const details = item.details as ExpenseActivityDetailsDto;
      return {
        ...base,
        kind: 'SHARED_EXPENSE',
        amountMinor: details.totalMinor,
        category: details.category,
        description: details.description,
        from: null,
        to: null,
        occurredAt: details.occurredAt,
      };
    }
    const details = item.details as SettlementActivityDetailsDto;
    return {
      ...base,
      kind: 'SHARED_SETTLEMENT',
      amountMinor: details.amountMinor,
      category: null,
      description: null,
      from: details.from,
      to: details.to,
      occurredAt: details.occurredAt,
    };
  }
}
