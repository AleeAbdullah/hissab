import { View } from 'react-native';

import type { DisplayCurrency, PersonalReportBucket } from '@/api/contracts';
import { Card, Row, SectionLabel } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { formatMinorAmount } from '@/lib/money';

export function PersonalSummary({
  displayCurrency,
  report,
  title
}: {
  displayCurrency: DisplayCurrency;
  report: Pick<
    PersonalReportBucket,
    'incomeMinor' | 'expenseMinor' | 'netMinor'
  >;
  title: string;
}) {
  const net = BigInt(report.netMinor);
  return (
    <View className="gap-2">
      <SectionLabel>{title.toUpperCase()}</SectionLabel>
      <Card>
        <Row
          title="Income"
          detail={formatMinorAmount(report.incomeMinor, displayCurrency)}
        />
        <Row
          title="Spending"
          detail={formatMinorAmount(report.expenseMinor, displayCurrency)}
        />
        <Row
          title={net >= 0n ? 'Left over' : 'Overspent'}
          detail={formatMinorAmount(
            net >= 0n ? report.netMinor : (-net).toString(),
            displayCurrency
          )}
        />
      </Card>
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        {net === 0n
          ? 'Income and spending are equal for this period.'
          : net > 0n
            ? 'Income is greater than spending for this period.'
            : 'Spending is greater than income for this period.'}
      </Text>
    </View>
  );
}

export function PersonalHistorySummary({
  displayCurrency,
  report,
  title,
  caption,
  type,
  loading
}: {
  displayCurrency: DisplayCurrency;
  report?: Pick<
    PersonalReportBucket,
    'incomeMinor' | 'expenseMinor' | 'netMinor'
  >;
  title: string;
  caption?: string;
  type?: 'INCOME' | 'EXPENSE';
  loading: boolean;
}) {
  const income = BigInt(report?.incomeMinor ?? '0');
  const spending = BigInt(report?.expenseMinor ?? '0');
  const difference = spending - income;
  const overspent = difference > 0n ? difference : 0n;
  const money = (amount: bigint) =>
    formatMinorAmount(amount.toString(), displayCurrency);
  const metrics = [
    ...(type !== 'EXPENSE'
      ? [
          {
            label: 'Income',
            value: income,
            tone:
              !type && income > spending ? 'text-positive' : 'text-foreground'
          }
        ]
      : []),
    ...(type !== 'INCOME'
      ? [{ label: 'Spending', value: spending, tone: 'text-foreground' }]
      : []),
    ...(!type
      ? [
          {
            label: 'Overspent',
            value: overspent,
            tone: overspent > 0n ? 'text-destructive' : 'text-foreground'
          }
        ]
      : [])
  ];
  const sentence =
    type === 'EXPENSE'
      ? "Income isn't shown while the Expenses filter is on."
      : type === 'INCOME'
        ? "Spending isn't shown while the Income filter is on."
        : income === 0n && spending === 0n
          ? 'No income or spending in this period.'
          : difference > 0n
            ? `Spending is ${money(difference)} more than income.`
            : difference < 0n
              ? `Income is ${money(-difference)} more than spending.`
              : 'Income and spending are equal.';
  const pending = loading || !report;
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${caption ? caption + '. ' : ''}${pending ? 'Loading totals.' : metrics.map((metric) => `${metric.label} ${money(metric.value)}.`).join(' ') + ' ' + sentence}`}
      className="gap-4 py-2"
    >
      <View className="gap-1">
        <Text className="text-[13px] font-semibold leading-[18px]">
          {title}
        </Text>
        {caption ? (
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            {caption}
          </Text>
        ) : null}
      </View>
      {metrics.map((metric) => (
        <View key={metric.label} className="gap-1">
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            {metric.label}
          </Text>
          {pending ? (
            <View className="h-9 w-48 rounded bg-muted" />
          ) : (
            <Text
              selectable
              className={`text-[28px] font-semibold tabular-nums leading-[34px] ${metric.tone}`}
            >
              {money(metric.value)}
            </Text>
          )}
        </View>
      ))}
      {!pending ? (
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {sentence}
        </Text>
      ) : null}
    </View>
  );
}
