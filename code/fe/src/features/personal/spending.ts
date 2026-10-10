import type { PersonalReportBucket } from '@/api/contracts';

export const SPENDING_PERIODS = ['1W', '1M', '6M', '1Y'] as const;
export type SpendingPeriod = (typeof SPENDING_PERIODS)[number];
export type SpendingBucket = 'DAY' | 'MONTH';

export const SPENDING_PERIOD_NAMES: Record<SpendingPeriod, string> = {
  '1W': 'Last 7 days',
  '1M': 'This month',
  '6M': 'Last 6 months',
  '1Y': 'Last 12 months'
};

// Fixed plot heights keep the layout stable across chart type, period, and load state.
export const SPENDING_PLOT_HEIGHT = 200;
export const SPENDING_COMPACT_PLOT_HEIGHT = 72;

export function spendingSeriesName(
  variant: 'line' | 'bar',
  bucket: SpendingBucket
) {
  return variant === 'line'
    ? 'Cumulative'
    : bucket === 'MONTH'
      ? 'Monthly'
      : 'Daily';
}

export function spendingBucket(period: SpendingPeriod): SpendingBucket {
  return period === '6M' || period === '1Y' ? 'MONTH' : 'DAY';
}

export function spendingRange(period: SpendingPeriod, now = new Date()) {
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

const dayLabel = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
});
const monthLabel = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  timeZone: 'UTC'
});
const dayYearLabel = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC'
});

// Short axis label for a bucket period: `d MMM` for days, `MMM` for months.
export function spendingAxisLabel(period: string, bucket: SpendingBucket) {
  return bucket === 'MONTH'
    ? monthLabel.format(new Date(`${period}-01T00:00:00Z`))
    : dayLabel.format(new Date(`${period}T00:00:00Z`));
}

// Inclusive date range of the half-open [from, to) report range, e.g. `May 1 – Oct 1, 2026`.
export function spendingRangeLabel(range: { from: string; to: string }) {
  const first = new Date(range.from);
  const last = new Date(new Date(range.to).getTime() - 86400000);
  if (first.toISOString().slice(0, 10) === last.toISOString().slice(0, 10))
    return dayYearLabel.format(last);
  const start =
    first.getUTCFullYear() === last.getUTCFullYear()
      ? dayLabel.format(first)
      : dayYearLabel.format(first);
  return `${start} – ${dayYearLabel.format(last)}`;
}

// Share of the total as text; non-zero amounts never round down to `0%`.
export function spendingShareLabel(amount: string, total: string) {
  const percent = Math.round(spendingRatio(amount, total) * 100);
  return percent === 0 && BigInt(amount) > 0n ? '<1%' : `${percent}%`;
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
