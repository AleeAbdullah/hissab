import { Text, View } from 'react-native';

import type { DisplayCurrency, PersonalReportBucket } from '@/api/contracts';
import { Card, Row, SectionLabel } from '@/components/ui';
import { formatMinorAmount } from '@/features/balances/format';
import { useAppTheme } from '@/theme/theme';

export function PersonalSummary({ displayCurrency, report, title }: { displayCurrency: DisplayCurrency; report: Pick<PersonalReportBucket, 'incomeMinor' | 'expenseMinor' | 'netMinor'>; title: string }) {
  const { colors } = useAppTheme();
  const net = BigInt(report.netMinor);
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{title.toUpperCase()}</SectionLabel>
      <Card>
        <Row title="Income" detail={formatMinorAmount(report.incomeMinor, displayCurrency)} />
        <Row title="Spending" detail={formatMinorAmount(report.expenseMinor, displayCurrency)} />
        <Row title={net >= 0n ? 'Left over' : 'Overspent'} detail={formatMinorAmount(net >= 0n ? report.netMinor : (-net).toString(), displayCurrency)} />
      </Card>
      <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
        {net >= 0n ? 'Income is greater than spending for this period.' : 'Spending is greater than income for this period.'}
      </Text>
    </View>
  );
}
