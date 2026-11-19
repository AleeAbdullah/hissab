import type { PersonalReportBucket } from '@/api/contracts';
import { i18n, intlLocale, isolate } from '@/i18n';
import { formatDate, formatPeriod, formatShortMonth } from '@/lib/dates';

export const SPENDING_PERIODS = ['1W', '1M', '6M', '1Y'] as const;
export type SpendingPeriod = (typeof SPENDING_PERIODS)[number];
export type SpendingBucket = 'DAY' | 'MONTH';

export const SPENDING_PERIOD_NAMES: Record<SpendingPeriod, string> = {
  get '1W'() {
    return i18n.t('personal:last7Days');
  },
  get '1M'() {
    return i18n.t('personal:thisMonth');
  },
  get '6M'() {
    return i18n.t('personal:last6Months');
  },
  get '1Y'() {
    return i18n.t('personal:last12Months');
  }
};

// Fixed plot heights keep the layout stable across chart type, period, and load state.
export const SPENDING_PLOT_HEIGHT = 200;
export const SPENDING_COMPACT_PLOT_HEIGHT = 72;

export function spendingSeriesName(
  variant: 'line' | 'bar',
  bucket: SpendingBucket
) {
  return variant === 'line'
    ? i18n.t('personal:cumulative')
    : bucket === 'MONTH'
      ? i18n.t('personal:monthly')
      : i18n.t('personal:daily');
}

export function spendingBucket(period: SpendingPeriod): SpendingBucket {
  return period === '6M' || period === '1Y' ? 'MONTH' : 'DAY';
}

export function spendingRange(
  period: SpendingPeriod,
  now = new Date(),
  monthOffset = 0
) {
  // An earlier month covers the whole month; the current one runs to today.
  if (period === '1M' && monthOffset < 0) {
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + monthOffset;
    return {
      from: new Date(Date.UTC(year, month, 1)).toISOString(),
      to: new Date(Date.UTC(year, month + 1, 1)).toISOString()
    };
  }
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  if (period === '1W') from.setTime(to.getTime() - 7 * 86400000);
  if (period === '6M') from.setUTCMonth(from.getUTCMonth() - 5);
  if (period === '1Y') from.setUTCMonth(from.getUTCMonth() - 11);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function spendingPoints(
  buckets: Pick<PersonalReportBucket, 'period' | 'expenseMinor'>[],
  range: { from: string; to: string },
  bucket: SpendingBucket = 'DAY'
) {
  const amounts = new Map(
    buckets.map((item) => [item.period, BigInt(item.expenseMinor)])
  );
  let total = 0n;
  const points = [];
  for (
    const date = new Date(range.from);
    date < new Date(range.to);
    bucket === 'MONTH'
      ? date.setUTCMonth(date.getUTCMonth() + 1, 1)
      : date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const period = date.toISOString().slice(0, bucket === 'MONTH' ? 7 : 10);
    const amount = amounts.get(period) ?? 0n;
    total += amount;
    points.push({
      period,
      amountMinor: amount.toString(),
      totalMinor: total.toString()
    });
  }
  return points;
}

// Short axis labels keep charts readable; full dates accompany their textual values.
export function spendingAxisLabel(period: string, bucket: SpendingBucket) {
  return bucket === 'MONTH'
    ? formatShortMonth(`${period}-01`)
    : formatDate(period, false);
}

export function spendingRangeLabel(range: { from: string; to: string }) {
  const last = new Date(new Date(range.to).getTime() - 86400000);
  return formatPeriod(range.from.slice(0, 10), last.toISOString().slice(0, 10));
}

// Share of the total as text; non-zero amounts never round down to `0%`.
export function spendingShareLabel(amount: string, total: string) {
  const percent = Math.round(spendingRatio(amount, total) * 100);
  const formatter = new Intl.NumberFormat(intlLocale(), {
    style: 'percent',
    maximumFractionDigits: 0
  });
  return percent === 0 && BigInt(amount) > 0n
    ? i18n.t('personal:lessThanPercent', {
        percent: isolate(formatter.format(0.01))
      })
    : formatter.format(percent / 100);
}

// Only chart geometry is converted to Number; monetary totals remain exact.
export function spendingRatio(amount: string, total: string) {
  return BigInt(total) > 0n
    ? Number((BigInt(amount) * 10000n) / BigInt(total)) / 10000
    : 0;
}

export function spendingSegments(amounts: string[]) {
  const total = amounts
    .reduce((sum, amount) => sum + BigInt(amount), 0n)
    .toString();
  let used = 0n;
  return amounts.map((amount) => {
    const start = spendingRatio(used.toString(), total);
    used += BigInt(amount);
    return { start, fraction: spendingRatio(used.toString(), total) - start };
  });
}
