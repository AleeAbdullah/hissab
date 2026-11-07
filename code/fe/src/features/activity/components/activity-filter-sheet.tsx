import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  UserRound,
  UsersRound,
  X,
  type LucideIcon
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ActivityArea } from '@/api/contracts';
import { ErrorMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export const activityAreas: {
  label: string;
  value?: ActivityArea;
  icon: LucideIcon;
}[] = [
  { label: 'All activity', icon: Layers },
  { label: 'Expenses', value: 'EXPENSE', icon: FileText },
  { label: 'Payments', value: 'SETTLEMENT', icon: ArrowLeftRight },
  { label: 'Groups', value: 'GROUP', icon: UsersRound },
  { label: 'Connections', value: 'CONNECTION', icon: UserRound }
];
export type ActivityFilters = { area?: ActivityArea; ledgerId?: string };
export type ActivityLedgerChoice = {
  id: string;
  name: string;
  subtitle: string;
  type?: 'GROUP' | 'DIRECT';
};

export function ActivityFilterSheet({
  filters,
  ledgers,
  error,
  loading,
  onRetry,
  onClose,
  onApply
}: {
  filters: ActivityFilters;
  ledgers: ActivityLedgerChoice[];
  error: unknown;
  loading: boolean;
  onRetry: () => void;
  onClose: () => void;
  onApply: (filters: ActivityFilters) => void;
}) {
  const [area, setArea] = useState(filters.area);
  const [ledgerId, setLedgerId] = useState(filters.ledgerId);
  const [expanded, setExpanded] = useState<'area' | 'ledger' | null>('area');
  const heading = useRef<View>(null);
  const count = Number(Boolean(area)) + Number(Boolean(ledgerId));
  const section = (id: 'area' | 'ledger', title: string, summary?: string) => (
    <Button
      variant="ghost"
      accessibilityLabel={`${title}, ${summary ?? ''}`}
      accessibilityState={{ expanded: expanded === id }}
      onPress={() => setExpanded(expanded === id ? null : id)}
      className="min-h-16 justify-start rounded-none border-b border-border px-0 py-2"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] font-semibold">{title}</Text>
        {summary ? (
          <Text className="text-[13px] text-muted-foreground">{summary}</Text>
        ) : null}
      </View>
      <Icon as={expanded === id ? ChevronUp : ChevronDown} size={20} />
    </Button>
  );
  const choice = (
    id: string,
    title: string,
    selected: boolean,
    onPress: () => void,
    subtitle?: string,
    icon?: LucideIcon
  ) => (
    <Button
      key={id}
      variant="ghost"
      role="radio"
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      className="w-full justify-start rounded-none border-b border-border py-3"
    >
      {icon ? <Icon as={icon} size={20} accessible={false} /> : null}
      <View className="min-w-0 flex-1">
        <Text className="text-base">{title}</Text>
        {subtitle ? (
          <Text className="text-[13px] text-muted-foreground">{subtitle}</Text>
        ) : null}
      </View>
      {selected ? (
        <Icon
          as={Check}
          size={20}
          className="text-primary"
          accessible={false}
        />
      ) : null}
    </Button>
  );
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        if (heading.current) {
          AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
        }
      }}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0 bg-scrim opacity-50 dark:opacity-70"
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
        />
        <SafeAreaView
          edges={['bottom']}
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          className="h-[92%] rounded-t-[20px] bg-background"
        >
          <View className="flex-row items-center justify-between px-5 pt-4">
            <View
              ref={heading}
              accessible
              accessibilityRole="header"
              className="min-w-0 flex-1"
            >
              <Text className="text-[32px] font-semibold leading-[38px]">
                Filters
              </Text>
            </View>
            <Button
              className="w-12 px-0"
              variant="ghost"
              accessibilityLabel="Close filters"
              onPress={onClose}
            >
              <Icon as={X} size={24} />
            </Button>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pb-4"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View className="gap-2">
                <ErrorMessage error={error} />
                <Button variant="outline" onPress={onRetry}>
                  <Text>Retry loading ledgers</Text>
                </Button>
              </View>
            ) : null}
            {section(
              'area',
              'Area',
              activityAreas.find((item) => item.value === area)?.label
            )}
            {expanded === 'area'
              ? activityAreas.map((item) =>
                  choice(
                    item.value ?? 'all',
                    item.label,
                    area === item.value,
                    () => setArea(item.value),
                    undefined,
                    item.icon
                  )
                )
              : null}
            {section(
              'ledger',
              'Ledger',
              ledgers.find((item) => item.id === ledgerId)?.name ??
                'All ledgers'
            )}
            {expanded === 'ledger' ? (
              <>
                {choice('all-ledgers', 'All ledgers', !ledgerId, () =>
                  setLedgerId(undefined)
                )}
                {loading ? <Text>Loading ledgers…</Text> : null}
                {[undefined, 'GROUP', 'DIRECT'].map((type) => {
                  const choices = ledgers.filter((item) => item.type === type);
                  return choices.length ? (
                    <View key={type ?? 'history'}>
                      <Text
                        accessibilityRole="header"
                        className="pt-4 text-[15px] font-semibold text-muted-foreground"
                      >
                        {type === 'GROUP'
                          ? 'Groups'
                          : type === 'DIRECT'
                            ? 'Direct ledgers'
                            : 'Selected history'}
                      </Text>
                      {choices.map((item) =>
                        choice(
                          item.id,
                          item.name,
                          ledgerId === item.id,
                          () => setLedgerId(item.id),
                          item.subtitle
                        )
                      )}
                    </View>
                  ) : null;
                })}
              </>
            ) : null}
          </ScrollView>
          <View className="gap-2 border-t border-border px-5 py-3">
            <Button
              className="rounded-full"
              onPress={() => onApply({ area, ledgerId })}
            >
              <Text>See results</Text>
            </Button>
            <Button
              variant="ghost"
              disabled={!count}
              onPress={() => {
                setArea(undefined);
                setLedgerId(undefined);
              }}
            >
              <Text className="text-primary">Clear filters ({count})</Text>
            </Button>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
