import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { ActivityArea } from '@/api/contracts';
import { Card, ErrorMessage, Row, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { activityAreaFromParam } from '@/features/activity/api';
import { connectionsQuery } from '@/features/connections/api';
import { groupsQuery } from '@/features/groups/api';

const areas: { label: string; value?: ActivityArea }[] = [
  { label: 'All activity' },
  { label: 'Expenses', value: 'EXPENSE' },
  { label: 'Payments', value: 'SETTLEMENT' },
  { label: 'Groups', value: 'GROUP' },
  { label: 'Connections', value: 'CONNECTION' }
];

export default function ActivitySearchScreen() {
  const params = useLocalSearchParams<{ area?: string; ledgerId?: string }>();
  const [area, setArea] = useState<ActivityArea | undefined>(() =>
    activityAreaFromParam(params.area)
  );
  const [ledgerId, setLedgerId] = useState<string | undefined>(() =>
    typeof params.ledgerId === 'string' ? params.ledgerId : undefined
  );
  const groups = useQuery(groupsQuery);
  const connections = useQuery(connectionsQuery);
  const ledgers = [
    ...(groups.data ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      subtitle: group.status === 'ARCHIVED' ? 'Archived group' : 'Group'
    })),
    ...(connections.data ?? []).map((connection) => ({
      id: connection.ledgerId,
      name: connection.displayName,
      subtitle: 'Direct ledger'
    }))
  ].sort((left, right) => left.name.localeCompare(right.name));
  const apply = () =>
    router.replace({
      pathname: '/activity',
      params: { ...(area ? { area } : {}), ...(ledgerId ? { ledgerId } : {}) }
    });
  const clear = () => {
    setArea(undefined);
    setLedgerId(undefined);
  };

  return (
    <Screen>
      {groups.error || connections.error ? (
        <ErrorMessage error={groups.error ?? connections.error} />
      ) : null}
      <View className="gap-2">
        <SectionLabel>FILTER BY AREA</SectionLabel>
        <Card>
          {areas.map((choice) => (
            <FilterRow
              key={choice.label}
              title={choice.label}
              selected={area === choice.value}
              onPress={() => setArea(choice.value)}
            />
          ))}
        </Card>
      </View>
      <View className="gap-2">
        <SectionLabel>FILTER BY LEDGER</SectionLabel>
        {groups.isLoading || connections.isLoading ? (
          <Text selectable>Loading ledgers…</Text>
        ) : ledgers.length ? (
          <Card>
            <FilterRow
              title="All ledgers"
              selected={!ledgerId}
              onPress={() => setLedgerId(undefined)}
            />
            {ledgers.map((ledger) => (
              <FilterRow
                key={ledger.id}
                title={ledger.name}
                subtitle={ledger.subtitle}
                selected={ledgerId === ledger.id}
                onPress={() => setLedgerId(ledger.id)}
              />
            ))}
          </Card>
        ) : (
          <Text selectable>
            No groups or connections are available to filter.
          </Text>
        )}
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button variant="outline" onPress={clear}>
            <Text>Clear all</Text>
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={apply}>
            <Text>Show activity</Text>
          </Button>
        </View>
      </View>
    </Screen>
  );
}

function FilterRow({
  title,
  subtitle,
  selected,
  onPress
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Row
      title={title}
      subtitle={subtitle}
      detail={selected ? 'Included' : undefined}
      trailing={<FilterMark selected={selected} />}
      onPress={onPress}
    />
  );
}

function FilterMark({ selected }: { selected: boolean }) {
  return (
    <Text
      accessibilityLabel={selected ? 'Selected' : 'Not selected'}
      className="text-[17px] font-bold text-primary"
    >
      {selected ? '✓' : ''}
    </Text>
  );
}
