import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import {
  BedDouble,
  BriefcaseBusiness,
  BusFront,
  Check,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clapperboard,
  Gift,
  HeartPulse,
  PlugZap,
  RotateCcw,
  Shapes,
  ShoppingBag,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon
} from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  DisplayCurrency,
  PersonalCategory,
  PersonalCategoryCode,
  PersonalTransactionType
} from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { AmountRangeSlider } from '@/features/personal/components/amount-range-slider';
import {
  currentPeriodDates,
  formatDate,
  localDateKey,
  localPickerDate
} from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export type TransactionFilters = {
  type?: PersonalTransactionType;
  categoryCode?: PersonalCategoryCode;
  fromDate?: string;
  toDate?: string;
  minAmountMinor?: string;
  maxAmountMinor?: string;
};

type FilterSection = 'AMOUNT' | 'CATEGORY' | 'DATE';

const CATEGORY_ICONS: Record<PersonalCategoryCode, LucideIcon> = {
  FOOD_AND_DRINK: UtensilsCrossed,
  GROCERIES: ShoppingBasket,
  TRANSPORT: BusFront,
  ACCOMMODATION: BedDouble,
  UTILITIES: PlugZap,
  ENTERTAINMENT: Clapperboard,
  SHOPPING: ShoppingBag,
  HEALTHCARE: HeartPulse,
  OTHER: Shapes,
  SALARY: Wallet,
  FREELANCE: BriefcaseBusiness,
  BUSINESS: Store,
  GIFTS: Gift,
  REFUNDS: RotateCcw,
  OTHER_INCOME: CircleDollarSign
};

function dateLabel(value?: string) {
  if (!value) return 'Any date';
  return formatDate(value);
}

export function TransactionFilterSheet({
  amountLimitMinor,
  categories,
  displayCurrency,
  filters,
  onApply,
  onClose,
  visible
}: {
  amountLimitMinor?: string | null;
  categories: PersonalCategory[];
  displayCurrency: DisplayCurrency;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClose: () => void;
  visible: boolean;
}) {
  const primaryColor = useThemeVariable(THEME_VARIABLES.primary);
  const amountMaximum = [
    amountLimitMinor,
    filters.minAmountMinor,
    filters.maxAmountMinor
  ].reduce((maximum, value) => {
    const amount = BigInt(value ?? '0');
    return amount > maximum ? amount : maximum;
  }, 0n);
  const sliderMaximum =
    amountMaximum > 0n ? amountMaximum.toString() : undefined;
  const [draftCategoryCode, setDraftCategoryCode] = useState(
    filters.categoryCode
  );
  const [draftFromDate, setDraftFromDate] = useState(filters.fromDate);
  const [draftToDate, setDraftToDate] = useState(filters.toDate);
  const [draftMinimum, setDraftMinimum] = useState(
    filters.minAmountMinor ?? '0'
  );
  const [draftMaximum, setDraftMaximum] = useState(
    filters.maxAmountMinor ?? sliderMaximum ?? '0'
  );
  const [draftUpperLimited, setDraftUpperLimited] = useState(
    filters.maxAmountMinor !== undefined
  );
  const [expanded, setExpanded] = useState<FilterSection | null>(
    sliderMaximum ? 'AMOUNT' : null
  );
  const [pickingDate, setPickingDate] = useState<'from' | 'to' | null>(null);

  const choices = categories.filter(
    (category) => !filters.type || category.kind === filters.type
  );
  const selectedCategory = categories.find(
    (category) => category.code === draftCategoryCode
  );
  const amountActive = BigInt(draftMinimum) > 0n || draftUpperLimited;
  const datesActive = Boolean(draftFromDate || draftToDate);
  const activeCount =
    Number(Boolean(draftCategoryCode)) +
    Number(datesActive) +
    Number(amountActive);
  const invalidDates = Boolean(
    draftFromDate && draftToDate && draftFromDate > draftToDate
  );

  const section = (
    id: FilterSection,
    title: string,
    detail: string,
    active: boolean
  ) => (
    <Button
      variant="ghost"
      className="min-h-16 w-full justify-start rounded-none border-b border-border px-0 py-2"
      accessibilityLabel={`${title}, ${detail}, ${expanded === id ? 'expanded' : 'collapsed'}`}
      accessibilityState={{ expanded: expanded === id }}
      onPress={() => setExpanded(expanded === id ? null : id)}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] font-semibold text-foreground">
          {title}
        </Text>
        {active ? (
          <Text className="text-[13px] text-muted-foreground">{detail}</Text>
        ) : null}
      </View>
      <Icon
        as={expanded === id ? ChevronUp : ChevronDown}
        size={20}
        className="text-muted-foreground"
      />
    </Button>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        <Pressable
          className="absolute inset-0"
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={onClose}
        />
        <SafeAreaView
          edges={['bottom']}
          className="h-[92%] rounded-t-[20px] bg-background"
        >
          <View className="flex-row items-center justify-between px-5 pt-4">
            <Text className="text-[32px] font-semibold leading-[38px] text-foreground">
              Filters
            </Text>
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
            {section(
              'AMOUNT',
              'Amount',
              amountActive
                ? `${formatMinorAmount(draftMinimum, displayCurrency)} – ${formatMinorAmount(draftMaximum, displayCurrency)}`
                : 'Any amount',
              amountActive
            )}
            {expanded === 'AMOUNT' ? (
              <View className="gap-3 py-4">
                {sliderMaximum ? (
                  <>
                    <Text className="text-center text-base text-foreground">
                      {formatMinorAmount(draftMinimum, displayCurrency)} –{' '}
                      {formatMinorAmount(draftMaximum, displayCurrency)}
                    </Text>
                    <AmountRangeSlider
                      displayCurrency={displayCurrency}
                      maximumMinor={sliderMaximum}
                      minimumMinor={draftMinimum}
                      upperMinor={draftMaximum}
                      onChange={(minimum, maximum) => {
                        setDraftMinimum(minimum);
                        setDraftMaximum(maximum);
                        setDraftUpperLimited(BigInt(maximum) < amountMaximum);
                      }}
                    />
                  </>
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    {amountLimitMinor === null
                      ? 'No positive amounts are available for this selection.'
                      : 'Amount range is temporarily unavailable.'}
                  </Text>
                )}
              </View>
            ) : null}

            {section(
              'CATEGORY',
              'Category',
              selectedCategory?.name ?? 'All categories',
              Boolean(draftCategoryCode)
            )}
            {expanded === 'CATEGORY' ? (
              <View className="pb-2">
                {[{ code: undefined, name: 'All categories' }, ...choices].map(
                  (category) => {
                    const selected = draftCategoryCode === category.code;
                    const symbol = category.code
                      ? CATEGORY_ICONS[category.code]
                      : Shapes;
                    return (
                      <Button
                        key={category.code ?? 'ALL'}
                        variant="ghost"
                        className="min-h-12 w-full justify-start gap-3 rounded-none px-0 py-2"
                        accessibilityState={{ selected }}
                        onPress={() => setDraftCategoryCode(category.code)}
                      >
                        <View className="h-8 w-8 items-center justify-center rounded-full bg-secondary">
                          <Icon
                            as={symbol}
                            size={18}
                            className="text-secondary-foreground"
                          />
                        </View>
                        <Text className="min-w-0 flex-1 text-base font-normal text-foreground">
                          {category.name}
                        </Text>
                        {selected ? (
                          <Icon as={Check} size={20} className="text-primary" />
                        ) : null}
                      </Button>
                    );
                  }
                )}
              </View>
            ) : null}

            {section(
              'DATE',
              'Date',
              datesActive
                ? `${dateLabel(draftFromDate)} – ${dateLabel(draftToDate)}`
                : 'Any date',
              datesActive
            )}
            {expanded === 'DATE' ? (
              <View className="gap-3 py-4">
                <View className="flex-row flex-wrap gap-2">
                  {(['This month', 'Last month', 'This year'] as const).map(
                    (period) => {
                      const dates = currentPeriodDates(period);
                      return (
                        <Button
                          key={period}
                          size="compact"
                          variant="outline"
                          accessibilityState={{
                            selected:
                              draftFromDate === dates.fromDate &&
                              draftToDate === dates.toDate
                          }}
                          onPress={() => {
                            setDraftFromDate(dates.fromDate);
                            setDraftToDate(dates.toDate);
                          }}
                        >
                          <Text>{period}</Text>
                        </Button>
                      );
                    }
                  )}
                </View>
                <View className="flex-row gap-3">
                  {(['from', 'to'] as const).map((side) => (
                    <Button
                      key={side}
                      variant="outline"
                      className="min-w-0 flex-1 flex-col items-start gap-1 px-3 py-2"
                      accessibilityLabel={`${side === 'from' ? 'From' : 'To'} date, ${dateLabel(side === 'from' ? draftFromDate : draftToDate)}`}
                      onPress={() => setPickingDate(side)}
                    >
                      <Text className="text-xs text-muted-foreground">
                        {side === 'from' ? 'From' : 'To'}
                      </Text>
                      <Text className="text-sm text-primary">
                        {dateLabel(
                          side === 'from' ? draftFromDate : draftToDate
                        )}
                      </Text>
                    </Button>
                  ))}
                </View>
                {datesActive ? (
                  <Button
                    variant="ghost"
                    className="self-start px-0"
                    onPress={() => {
                      setDraftFromDate(undefined);
                      setDraftToDate(undefined);
                    }}
                  >
                    <Text className="text-primary">Clear dates</Text>
                  </Button>
                ) : null}
                {invalidDates ? (
                  <Text className="text-sm text-destructive">
                    From must be on or before To.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
          <View className="gap-2 border-t border-border px-5 py-3">
            <Button
              className="rounded-full"
              disabled={invalidDates}
              accessibilityState={{ disabled: invalidDates }}
              onPress={() =>
                onApply({
                  type: filters.type,
                  categoryCode: draftCategoryCode,
                  fromDate: draftFromDate,
                  toDate: draftToDate,
                  minAmountMinor:
                    amountActive && BigInt(draftMinimum) > 0n
                      ? draftMinimum
                      : undefined,
                  maxAmountMinor: draftUpperLimited ? draftMaximum : undefined
                })
              }
            >
              <Text>See results</Text>
            </Button>
            <Button
              variant="ghost"
              disabled={!activeCount}
              accessibilityState={{ disabled: !activeCount }}
              onPress={() => {
                setDraftCategoryCode(undefined);
                setDraftFromDate(undefined);
                setDraftToDate(undefined);
                setDraftMinimum('0');
                setDraftMaximum(sliderMaximum ?? '0');
                setDraftUpperLimited(false);
              }}
            >
              <Text className="text-primary">
                Clear filters ({activeCount})
              </Text>
            </Button>
          </View>
        </SafeAreaView>
      </View>
      {pickingDate ? (
        <DateTimePicker
          mode="date"
          presentation="dialog"
          value={localPickerDate(
            pickingDate === 'from' ? draftFromDate : draftToDate
          )}
          accentColor={primaryColor}
          minimumDate={
            pickingDate === 'to' && draftFromDate
              ? localPickerDate(draftFromDate)
              : undefined
          }
          maximumDate={
            pickingDate === 'from' && draftToDate
              ? localPickerDate(draftToDate)
              : undefined
          }
          onValueChange={(_, date) => {
            if (pickingDate === 'from') setDraftFromDate(localDateKey(date));
            else setDraftToDate(localDateKey(date));
            setPickingDate(null);
          }}
          onDismiss={() => setPickingDate(null)}
        />
      ) : null}
    </Modal>
  );
}
