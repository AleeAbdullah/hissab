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

// The revision version is only used to look up the viewer's expense share.
type RecentDraft = Omit<HomeRecentItemDto, 'shareMinor'> & { version: number };

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
    const shares = await this.repository.listOwnShares(
      userId,
      recent
        .filter((item) => item.kind === 'SHARED_EXPENSE')
        .map((item) => ({ rootExpenseId: item.id, version: item.version })),
    );

    return {
      currency: profile.displayCurrency,
      locale: profile.locale,
      personal: { monthNetMinor },
      shared: {
        totalNetMinor: balances.totalNetMinor,
        unsettledLedgerCount: balances.ledgers.filter(
          (ledger) => ledger.netMinor !== '0',
        ).length,
        peopleCount,
      },
      recent: recent.map(({ version, ...item }) => ({
        ...item,
        shareMinor:
          item.kind === 'SHARED_EXPENSE'
            ? (shares.get(`${item.id}:${version}`) ?? '0')
            : null,
      })),
    };
  }

  private personalItem(item: PersonalTransactionView): RecentDraft {
    return {
      version: 0,
      eventType: null,
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
  private sharedItem(item: ActivityItemDto): RecentDraft {
    const base = {
      id: item.aggregateId,
      eventType: item.eventType,
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
        version: details.version,
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
      version: details.version,
      amountMinor: details.amountMinor,
      category: null,
      description: null,
      from: details.from,
      to: details.to,
      occurredAt: details.occurredAt,
    };
  }
}
