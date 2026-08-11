import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { ActivityArea } from '@/api/contracts';
import { Button, Card, ErrorMessage, Row, Screen, SectionLabel } from '@/components/ui';
import { activityAreaFromParam } from '@/features/activity/api';
import { connectionsQuery } from '@/features/connections/api';
import { groupsQuery } from '@/features/groups/api';
import { useAppTheme } from '@/theme/theme';

const areas: { label: string; value?: ActivityArea }[] = [
  { label: 'All activity' },
  { label: 'Expenses', value: 'EXPENSE' },
  { label: 'Payments', value: 'SETTLEMENT' },
  { label: 'Groups', value: 'GROUP' },
  { label: 'Connections', value: 'CONNECTION' },
];

export default function ActivitySearchScreen() {
  const params = useLocalSearchParams<{ area?: string; ledgerId?: string }>();
  const [area, setArea] = useState<ActivityArea | undefined>(() => activityAreaFromParam(params.area));
  const [ledgerId, setLedgerId] = useState<string | undefined>(() => typeof params.ledgerId === 'string' ? params.ledgerId : undefined);
  const groups = useQuery(groupsQuery);
  const connections = useQuery(connectionsQuery);
  const ledgers = [
    ...(groups.data ?? []).map((group) => ({ id: group.id, name: group.name, subtitle: group.status === 'ARCHIVED' ? 'Archived group' : 'Group' })),
    ...(connections.data ?? []).map((connection) => ({ id: connection.ledgerId, name: connection.displayName, subtitle: 'Direct ledger' })),
  ].sort((left, right) => left.name.localeCompare(right.name));
  const apply = () => router.replace({
    pathname: '/activity',
    params: { ...(area ? { area } : {}), ...(ledgerId ? { ledgerId } : {}) },
  });
  const clear = () => {
    setArea(undefined);
    setLedgerId(undefined);
  };

  return (
    <Screen>
      {groups.error || connections.error ? <ErrorMessage error={groups.error ?? connections.error} /> : null}
      <View style={{ gap: 8 }}>
        <SectionLabel>FILTER BY AREA</SectionLabel>
        <Card>
          {areas.map((choice) => <FilterRow key={choice.label} title={choice.label} selected={area === choice.value} onPress={() => setArea(choice.value)} />)}
        </Card>
      </View>
      <View style={{ gap: 8 }}>
        <SectionLabel>FILTER BY LEDGER</SectionLabel>
        {groups.isLoading || connections.isLoading ? <Text selectable>Loading ledgers…</Text> : ledgers.length ? (
          <Card>
            <FilterRow title="All ledgers" selected={!ledgerId} onPress={() => setLedgerId(undefined)} />
            {ledgers.map((ledger) => <FilterRow key={ledger.id} title={ledger.name} subtitle={ledger.subtitle} selected={ledgerId === ledger.id} onPress={() => setLedgerId(ledger.id)} />)}
          </Card>
        ) : <Text selectable>No groups or connections are available to filter.</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Clear all" secondary onPress={clear} /></View>
        <View style={{ flex: 1 }}><Button title="Show activity" onPress={apply} /></View>
      </View>
    </Screen>
  );
}

function FilterRow({ title, subtitle, selected, onPress }: { title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  return <Row title={title} subtitle={subtitle} detail={selected ? 'Included' : undefined} trailing={<FilterMark selected={selected} />} onPress={onPress} />;
}

function FilterMark({ selected }: { selected: boolean }) {
  const { colors } = useAppTheme();
  return <Text accessibilityLabel={selected ? 'Selected' : 'Not selected'} style={{ color: colors.brand, fontSize: 17, fontWeight: '700' }}>{selected ? '✓' : ''}</Text>;
}
