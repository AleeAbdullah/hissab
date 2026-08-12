import { View } from 'react-native';

import type { DisplayCurrency, PersonalReportBucket } from '@/api/contracts';
import { Card, Row, SectionLabel } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { formatMinorAmount } from '@/features/balances/format';

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
        {net >= 0n
          ? 'Income is greater than spending for this period.'
          : 'Spending is greater than income for this period.'}
      </Text>
    </View>
  );
}
