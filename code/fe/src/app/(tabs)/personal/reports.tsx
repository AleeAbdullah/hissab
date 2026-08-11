import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { DisplayCurrency, PersonalReport } from '@/api/contracts';
import { Button, Card, ErrorMessage, Field, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { formatMinorAmount } from '@/features/balances/format';
import { ChoiceChips } from '@/features/expenses/components/choice-chips';
import { dateToIso } from '@/features/expenses/form';
import { PersonalSummary } from '@/features/personal/components/personal-summary';
import { personalReportQuery } from '@/features/personal/api';
import { dateToExclusiveIso, periodLabel } from '@/features/personal/form';

export default function ReportsScreen() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filters, setFilters] = useState<{ from?: string; to?: string; bucket: PersonalReport['bucket'] }>({ bucket: 'MONTH' });
  const [validationError, setValidationError] = useState<string | null>(null);
  const profile = useQuery(profileQuery);
  const report = useQuery(personalReportQuery(filters));
  const apply = () => {
    const from = fromDate ? dateToIso(fromDate) ?? undefined : undefined;
    const to = toDate ? dateToExclusiveIso(toDate) ?? undefined : undefined;
    if ((fromDate && !from) || (toDate && !to) || (from && to && from >= to)) return setValidationError('Enter a valid date range as YYYY-MM-DD.');
    setValidationError(null);
    setFilters({ from, to, bucket: filters.bucket });
  };
  if (profile.isLoading || report.isLoading) return <Loading />;
  if (profile.error || report.error || !profile.data || !report.data) return <Screen><ErrorMessage error={profile.error ?? report.error ?? new Error('Reports are unavailable.')} /></Screen>;

  return (
    <Screen>
      {validationError ? <ErrorMessage error={new Error(validationError)} /> : null}
      <Card>
        <Row title="Report mode" detail={report.data.mode === 'OWED_SHARE' ? 'Your share' : 'Cash paid'} href="/report-mode" />
      </Card>
      <View style={{ gap: 8 }}>
        <SectionLabel>PERIOD</SectionLabel>
        <Field label="From" hint="YYYY-MM-DD, optional" value={fromDate} onChangeText={setFromDate} autoCapitalize="none" />
        <Field label="To" hint="YYYY-MM-DD, inclusive and optional" value={toDate} onChangeText={setToDate} autoCapitalize="none" />
        <Button title="Apply period" secondary onPress={apply} />
      </View>
      <View style={{ gap: 8 }}>
        <SectionLabel>GROUP BY</SectionLabel>
        <ChoiceChips choices={[{ label: 'Month', value: 'MONTH' }, { label: 'Day', value: 'DAY' }]} value={filters.bucket} onChange={(value) => setFilters({ ...filters, bucket: value as PersonalReport['bucket'] })} />
      </View>
      <PersonalSummary displayCurrency={profile.data.displayCurrency} report={report.data} title={filters.from || filters.to ? 'Selected period' : 'All time'} />
      <View style={{ gap: 8 }}>
        <SectionLabel>{report.data.bucket === 'MONTH' ? 'MONTHLY TOTALS' : 'DAILY TOTALS'}</SectionLabel>
        {report.data.buckets.length ? <Card>{report.data.buckets.slice().reverse().map((bucket) => <Row key={bucket.period} title={periodLabel(bucket.period, report.data.bucket)} subtitle={`Income ${formatBucket(bucket.incomeMinor, profile.data.displayCurrency)} · Spending ${formatBucket(bucket.expenseMinor, profile.data.displayCurrency)}`} detail={BigInt(bucket.netMinor) >= 0n ? `Left ${formatBucket(bucket.netMinor, profile.data.displayCurrency)}` : `Over ${formatBucket((-BigInt(bucket.netMinor)).toString(), profile.data.displayCurrency)}`} />)}</Card> : <Text selectable>No totals for this period.</Text>}
      </View>
    </Screen>
  );
}

function formatBucket(minor: string, displayCurrency: DisplayCurrency) {
  return formatMinorAmount(minor, displayCurrency);
}
