import { View } from 'react-native';

import type { DisplayCurrency, PersonalReportBucket } from '@/api/contracts';
import { AmountText, Card } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

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
  const net = income - spending;
  const money = (amount: bigint) =>
    formatMinorAmount(
      (amount < 0n ? -amount : amount).toString(),
      displayCurrency
    );
  const figures = [
    ...(type !== 'EXPENSE'
      ? [
          {
            label: 'Income',
            value: income,
            tone: income > 0n ? 'text-positive' : undefined
          }
        ]
      : []),
    ...(type !== 'INCOME'
      ? [{ label: 'Spending', value: spending, tone: undefined }]
      : []),
    ...(!type
      ? [
          {
            label: net < 0n ? 'Overspent' : 'Left over',
            value: net,
            tone:
              net < 0n
                ? 'text-destructive'
                : net > 0n
                  ? 'text-positive'
                  : undefined
          }
        ]
      : [])
  ];
  const pending = loading || !report;
  return (
    <Card className="gap-3 p-4">
      <View
        accessible
        accessibilityLabel={`${title}. ${caption ? caption + '. ' : ''}${pending ? 'Loading totals.' : figures.map((figure) => `${figure.label} ${money(figure.value)}.`).join(' ')}`}
        className="gap-3"
      >
        <View className="gap-0.5">
          <Text className="text-base font-semibold leading-[22px]">
            {title}
          </Text>
          {caption ? (
            <Text className="text-[13px] leading-[18px] text-muted-foreground">
              {caption}
            </Text>
          ) : null}
        </View>
        <View className="flex-row gap-4 border-t border-border pt-3">
          {figures.map((figure) => (
            <View key={figure.label} className="flex-1 gap-0.5">
              <Text className="text-[13px] leading-[18px] text-muted-foreground">
                {figure.label}
              </Text>
              {pending ? (
                <View className="h-[22px] w-20 rounded bg-muted" />
              ) : (
                <AmountText
                  className={cn(
                    'text-base font-semibold tabular-nums leading-[22px]',
                    figure.tone
                  )}
                >
                  {money(figure.value)}
                </AmountText>
              )}
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}
