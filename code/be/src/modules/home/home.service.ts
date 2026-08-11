import { Injectable } from '@nestjs/common';

import { ActivityService } from '../activity/activity.service';
import type { ActivityItemDto } from '../activity/dto/activity.dto';
import { BalancesService } from '../balances/balances.service';
import { PersonalService } from '../personal/personal.service';
import type { PersonalTransactionView } from '../personal/personal.repository';
import { UsersService } from '../users/users.service';
import {
  type HomeDto,
  type HomeRecentItemDto,
  HomeCategoryDto,
  HomeLedgerDto,
  HomeUserDto,
} from './home.dto';
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
      this.personal.getReport(userId, {
        mode: 'CASH_OUT_OF_POCKET',
        bucket: 'MONTH',
      }),
      this.personal.listTransactions(userId, { limit: 5 }),
      this.activity.list(userId, { area: 'EXPENSE', limit: 5 }),
      this.activity.list(userId, { area: 'SETTLEMENT', limit: 5 }),
      this.repository.countPeopleInUnsettledLedgers(userId),
    ]);

    const month = currentMonth(profile.timezone);
    const monthNetMinor =
      report.buckets.find((bucket) => bucket.period === month)?.netMinor ?? '0';
    const recent = [
      ...personalTransactions.items.map((item) => this.personalItem(item)),
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

  private sharedItem(item: ActivityItemDto): HomeRecentItemDto {
    if (item.area === 'EXPENSE') {
      const details = item.details as {
        totalMinor: string;
        description: string;
        category: HomeCategoryDto;
        occurredAt: Date;
      };
      return {
        kind: 'SHARED_EXPENSE',
        id: item.aggregateId,
        amountMinor: details.totalMinor,
        ledger: item.ledger && this.ledger(item.ledger),
        actor: item.actor && this.user(item.actor),
        category: details.category,
        description: details.description,
        from: null,
        to: null,
        occurredAt: details.occurredAt,
        createdAt: item.createdAt,
      };
    }

    const details = item.details as {
      amountMinor: string;
      from: HomeUserDto;
      to: HomeUserDto;
      occurredAt: Date;
    };
    return {
      kind: 'SHARED_SETTLEMENT',
      id: item.aggregateId,
      amountMinor: details.amountMinor,
      ledger: item.ledger && this.ledger(item.ledger),
      actor: item.actor && this.user(item.actor),
      category: null,
      description: null,
      from: details.from,
      to: details.to,
      occurredAt: details.occurredAt,
      createdAt: item.createdAt,
    };
  }

  private ledger(ledger: ActivityItemDto['ledger']): HomeLedgerDto {
    if (!ledger) {
      throw new Error('Expected a ledger.');
    }
    return { id: ledger.id, type: ledger.type, name: ledger.name };
  }

  private user(user: NonNullable<ActivityItemDto['actor']>): HomeUserDto {
    return { userId: user.userId, displayName: user.displayName };
  }
}

function currentMonth(timezone: string): string {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts();
  const year = values.find((part) => part.type === 'year')?.value;
  const month = values.find((part) => part.type === 'month')?.value;
  if (!year || !month) {
    throw new Error('Could not determine the current month.');
  }
  return `${year}-${month}`;
}
