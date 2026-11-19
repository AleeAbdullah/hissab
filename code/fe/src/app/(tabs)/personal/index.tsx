import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icons } from '@/components/icons';
import {
  AmountText,
  DayHeading,
  ErrorMessage,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { surfaceVariants } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { groupByDay } from '@/features/activity/presentation';
import {
  personalHistoryInfiniteQuery,
  personalReportQuery
} from '@/features/personal/api';
import { PersonalHistoryRow } from '@/features/personal/components/personal-history-row';
import { SpendingChart } from '@/features/personal/components/spending-chart';
import { spendingRange } from '@/features/personal/spending';
import { isolate } from '@/i18n';
import { absMinor, formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export default function PersonalScreen() {
  const { t } = useTranslation(['personal', 'common']);
  const profile = useQuery(profileQuery);
  const range = spendingRange('1M');
  const report = useQuery(personalReportQuery({ ...range, bucket: 'DAY' }));
  const history = useInfiniteQuery(personalHistoryInfiniteQuery({}, 5));
  const recent = useMemo(
    () => history.data?.pages.flatMap((page) => page.items) ?? [],
    [history.data]
  );
  if (profile.isLoading || report.isLoading || history.isLoading)
    return <Loading />;
  if (
    profile.error ||
    report.error ||
    history.error ||
    !profile.data ||
    !report.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            profile.error ??
            report.error ??
            history.error ??
            new Error(t('personalDataIsUnavailable'))
          }
        />
      </Screen>
    );
  const net = BigInt(report.data.netMinor);
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddTransactionButton /> }} />
      <Screen>
        <Link href="/personal/spending" asChild>
          <Button
            variant="ghost"
            role="link"
            className={cn(
              surfaceVariants(),
              'flex-col items-stretch gap-4 p-4'
            )}
            accessibilityLabel={t('homeSummary', {
              spent: isolate(
                formatMinorAmount(
                  report.data.expenseMinor,
                  profile.data.displayCurrency
                )
              ),
              income: isolate(
                formatMinorAmount(
                  report.data.incomeMinor,
                  profile.data.displayCurrency
                )
              ),
              balanceLabel: net < 0n ? t('overspent') : t('leftOver'),
              balance: isolate(
                formatMinorAmount(absMinor(net), profile.data.displayCurrency)
              )
            })}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-normal text-muted-foreground">
                  {t('spentThisMonth')}
                </Text>
                <AmountText className="text-[32px] font-semibold leading-[38px]">
                  {formatMinorAmount(
                    report.data.expenseMinor,
                    profile.data.displayCurrency
                  )}
                </AmountText>
                <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
                  {t('includesYourShareOfSharedExpenses')}
                </Text>
              </View>
              <Icon
                as={Icons.chevronRight}
                size={20}
                className="mt-0.5 text-primary"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <SpendingChart
              compact
              buckets={report.data.buckets}
              range={range}
              displayCurrency={profile.data.displayCurrency}
              emptyLabel={t('noSpendingYetThisMonth')}
            />
            <View className="flex-row gap-4 border-t border-border pt-3">
              {[
                {
                  label: t('income'),
                  value: report.data.incomeMinor,
                  tone: BigInt(report.data.incomeMinor) > 0n
                },
                {
                  label: net < 0n ? t('overspent') : t('leftOver'),
                  value: absMinor(net),
                  tone: net !== 0n
                }
              ].map((figure) => (
                <View key={figure.label} className="flex-1 gap-0.5">
                  <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
                    {figure.label}
                  </Text>
                  <AmountText
                    className={cn(
                      'text-base font-semibold tabular-nums leading-[22px]',
                      figure.tone &&
                        (figure.label === t('overspent')
                          ? 'text-destructive'
                          : 'text-positive')
                    )}
                  >
                    {formatMinorAmount(
                      figure.value,
                      profile.data.displayCurrency
                    )}
                  </AmountText>
                </View>
              ))}
            </View>
          </Button>
        </Link>
        <View className="gap-2">
          <SectionLabel>{t('historyHeading')}</SectionLabel>
          {recent.length ? (
            groupByDay(recent).map((day) => (
              <View key={day.title}>
                <DayHeading>{day.title}</DayHeading>
                {day.items.map((item, index) => (
                  <PersonalHistoryRow
                    key={`${item.kind}-${item.id}`}
                    divided={index > 0}
                    displayCurrency={profile.data.displayCurrency}
                    item={item}
                  />
                ))}
              </View>
            ))
          ) : (
            <Text selectable>{t('noHistoryYet')}</Text>
          )}
          <Link href="/personal/transactions" asChild>
            <Button
              variant="link"
              size="compact"
              role="link"
              className="justify-start px-0"
            >
              <Text>{t('seeAllHistory')}</Text>
              <Icon
                as={Icons.chevronRight}
                size={20}
                className="text-primary"
              />
            </Button>
          </Link>
        </View>
      </Screen>
    </>
  );
}

function AddTransactionButton() {
  const { t } = useTranslation(['personal', 'common']);
  return (
    <Link href="/personal-transaction" asChild>
      <Button
        className="w-12 px-0"
        variant="ghost"
        role="link"
        accessibilityLabel={t('addPersonalTransaction')}
      >
        <Icon as={Icons.add} size={24} className="text-primary" />
      </Button>
    </Link>
  );
}
