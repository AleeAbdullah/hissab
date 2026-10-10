import { useDialog } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { Link, router } from 'expo-router';
import { RefreshControl, useWindowDimensions, View } from 'react-native';

import type { Home, HomeRecentItem } from '@/api/contracts';
import { StackedCards } from '@/components/stacked-cards';
import {
  Card,
  ErrorMessage,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { activityDayLabel } from '@/features/activity/presentation';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';
import { cn, formatMinorAmount } from '@/lib/utils';

import { homeQuery } from '@/features/home/api';

type AmountTone = 'positive' | 'negative' | 'neutral';

export default function HomeScreen() {
  const dialog = useDialog();
  const primary = useThemeVariable(THEME_VARIABLES.primaryText);
  const home = useQuery(homeQuery);
  if (home.isLoading) return <Loading />;
  if (home.error || !home.data)
    return (
      <Screen>
        <ErrorMessage error={home.error ?? new Error('Home is unavailable.')} />
      </Screen>
    );

  const sharedNet = BigInt(home.data.shared.totalNetMinor);
  const sharedAmount =
    sharedNet < 0n ? (-sharedNet).toString() : home.data.shared.totalNetMinor;
  const personalNet = BigInt(home.data.personal.monthNetMinor);
  const personalTone: AmountTone =
    personalNet > 0n ? 'positive' : personalNet < 0n ? 'negative' : 'neutral';
  const sharedTone: AmountTone =
    sharedNet > 0n ? 'positive' : sharedNet < 0n ? 'negative' : 'neutral';
  const personalAmount = formatMinorAmount(
    home.data.personal.monthNetMinor,
    home.data.currency
  );
  const sharedAmountLabel = formatMinorAmount(sharedAmount, home.data.currency);
  const sharedDirection =
    sharedNet > 0n ? 'You’re owed' : sharedNet < 0n ? 'You owe' : 'Settled';
  const settleUp = () =>
    dialog(
      'Settle a balance',
      'Open the friend or group where you need to record the payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Friends',
          style: 'choice',
          onPress: () => router.push('/groups/friends')
        },
        {
          text: 'Open Groups',
          style: 'choice',
          onPress: () => router.push('/groups')
        }
      ]
    );

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => home.refetch()}
          tintColor={primary}
          colors={[primary]}
        />
      }
    >
      <StackedCards
        cards={[
          {
            id: 'personal',
            frontContent: (
              <View className="flex-1 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <Text
                    selectable
                    className="flex-1 text-xl font-bold leading-[26px]"
                  >
                    Personal
                  </Text>
                  <Text
                    selectable
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    className={cn(
                      'max-w-[58%] text-right text-[28px] font-bold tabular-nums leading-[34px]',
                      personalTone === 'positive'
                        ? 'text-positive'
                        : personalTone === 'negative'
                          ? 'text-destructive'
                          : 'text-foreground'
                    )}
                  >
                    {personalAmount}
                  </Text>
                </View>
                <View className="mt-auto flex-row flex-wrap gap-2 pr-[52px]">
                  <CardAction href="/personal-transaction" title="Add entry" />
                  <CardAction href="/personal" title="View personal" />
                </View>
              </View>
            ),
            backContent: (
              <View className="min-h-14 flex-row items-center justify-between gap-3 px-4">
                <Text
                  selectable
                  numberOfLines={1}
                  className="flex-1 text-lg font-bold"
                >
                  Personal
                </Text>
                <Text
                  selectable
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  className={cn(
                    'max-w-[58%] flex-1 text-right text-xl font-bold tabular-nums',
                    personalTone === 'positive'
                      ? 'text-positive'
                      : personalTone === 'negative'
                        ? 'text-destructive'
                        : 'text-foreground'
                  )}
                >
                  {personalAmount}
                </Text>
              </View>
            ),
            accessibilityLabel: 'Bring Personal card to front',
            className: 'border border-border bg-card'
          },
          {
            id: 'shared',
            frontContent: (
              <View className="flex-1 p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <Text
                    selectable
                    className="flex-1 text-xl font-bold leading-[26px]"
                  >
                    {sharedDirection}
                  </Text>
                  <Text
                    selectable
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    numberOfLines={1}
                    className={cn(
                      'max-w-[58%] text-right text-[28px] font-bold tabular-nums leading-[34px]',
                      sharedTone === 'positive'
                        ? 'text-positive'
                        : sharedTone === 'negative'
                          ? 'text-destructive'
                          : 'text-foreground'
                    )}
                  >
                    {sharedAmountLabel}
                  </Text>
                </View>
                <View className="mt-auto flex-row flex-wrap gap-2 pr-[52px]">
                  {sharedNet < 0n ? (
                    <CardAction onPress={settleUp} title="Settle up" />
                  ) : (
                    <CardAction href="/activity" title="View" />
                  )}
                </View>
              </View>
            ),
            backContent: (
              <View className="min-h-14 flex-row items-center justify-between gap-3 px-4">
                <Text
                  selectable
                  numberOfLines={1}
                  className="flex-1 text-lg font-bold"
                >
                  {sharedDirection}
                </Text>
                <Text
                  selectable
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  numberOfLines={1}
                  className={cn(
                    'max-w-[58%] flex-1 text-right text-xl font-bold tabular-nums',
                    sharedTone === 'positive'
                      ? 'text-positive'
                      : sharedTone === 'negative'
                        ? 'text-destructive'
                        : 'text-foreground'
                  )}
                >
                  {sharedAmountLabel}
                </Text>
              </View>
            ),
            accessibilityLabel: 'Bring balance card to front',
            className: 'border border-border bg-card'
          }
        ]}
      />
      <View className="gap-2">
        <View className="flex-row flex-wrap items-center justify-between gap-x-3">
          <SectionLabel>RECENT ACTIVITY</SectionLabel>
          <Link href="/activity" asChild>
            <Button variant="link" size="sm" role="link" className="px-0">
              <Text>View all</Text>
            </Button>
          </Link>
        </View>
        {home.data.recent.length ? (
          <Card>
            {home.data.recent.map((item) => (
              <RecentRow
                key={`${item.kind}-${item.id}-${item.createdAt}`}
                item={item}
                currency={home.data.currency}
              />
            ))}
          </Card>
        ) : (
          <Text selectable className="leading-6 text-muted-foreground">
            No recent activity yet.
          </Text>
        )}
      </View>
    </Screen>
  );
}

function CardAction({
  href,
  onPress,
  title
}: {
  href?: Href;
  onPress?: () => void;
  title: string;
}) {
  const action = (
    <Button
      variant="ghost"
      size="sm"
      role={href ? 'link' : 'button'}
      onPress={onPress}
      className="px-0 py-2 active:bg-transparent dark:active:bg-transparent"
    >
      <View className="group-active:bg-secondary/80 h-8 items-center justify-center rounded-xl bg-secondary px-3">
        <Text className="text-[15px] text-primary group-active:text-primary">
          {title}
        </Text>
      </View>
    </Button>
  );
  return href ? (
    <Link href={href} asChild>
      {action}
    </Link>
  ) : (
    action
  );
}

function RecentRow({
  item,
  currency
}: {
  item: HomeRecentItem;
  currency: Home['currency'];
}) {
  const { content, href } = recentPresentation(item);
  const { fontScale } = useWindowDimensions();
  const stackedAmount = Math.round(fontScale * 100) >= 130;
  const amountLabel = formatMinorAmount(item.amountMinor, currency).replace(
    /\s*(?=\d)/,
    '\u00a0'
  );
  const tone: AmountTone =
    item.kind === 'PERSONAL_INCOME'
      ? 'positive'
      : item.kind === 'PERSONAL_EXPENSE'
        ? 'negative'
        : 'neutral';
  const amount = (
    <Text
      selectable
      className={cn(
        'shrink-0 text-[15px] font-semibold tabular-nums leading-6',
        tone === 'positive'
          ? 'text-positive'
          : tone === 'negative'
            ? 'text-destructive'
            : 'text-foreground'
      )}
    >
      {amountLabel}
    </Text>
  );
  return (
    <Link href={href} asChild>
      <Button
        variant="ghost"
        role="link"
        accessibilityLabel={`${content.title}. ${content.tag}. ${content.subtitle}. ${amountLabel}`}
        className="min-h-[68px] w-full flex-col items-stretch justify-start gap-0 rounded-none border-b border-border p-4"
      >
        <View className="flex-row items-start gap-3">
          <Text
            selectable
            numberOfLines={3}
            className="flex-1 text-base font-semibold leading-6"
          >
            {content.title}
          </Text>
          {stackedAmount ? null : amount}
        </View>
        <Text
          selectable
          className="mt-1 text-[15px] font-normal leading-[22px] text-muted-foreground"
        >
          {content.tag} · {content.subtitle}
        </Text>
        {stackedAmount ? (
          <View className="mt-1 items-start">{amount}</View>
        ) : null}
      </Button>
    </Link>
  );
}

function recentPresentation(item: HomeRecentItem): {
  content: { tag: string; title: string; subtitle: string };
  href: Href;
} {
  const date = activityDayLabel(item.occurredAt);
  if (item.kind === 'PERSONAL_INCOME')
    return {
      content: {
        tag: 'Income',
        title: item.description ?? item.category?.name ?? 'Income',
        subtitle: `${date} · ${item.category?.name ?? 'Income'}`
      },
      href: {
        pathname: '/personal/[transactionId]',
        params: { transactionId: item.id }
      }
    };
  if (item.kind === 'PERSONAL_EXPENSE')
    return {
      content: {
        tag: 'Expense',
        title: item.description ?? item.category?.name ?? 'Expense',
        subtitle: `${date} · ${item.category?.name ?? 'Expense'}`
      },
      href: {
        pathname: '/personal/[transactionId]',
        params: { transactionId: item.id }
      }
    };
  if (item.kind === 'SHARED_EXPENSE')
    return {
      content: {
        tag: 'Shared',
        title: item.actor
          ? `${item.actor.displayName} added ${item.description ?? 'an expense'}`
          : (item.description ?? 'Shared expense'),
        subtitle: `${date} · ${item.ledger?.name ?? 'Shared ledger'}`
      },
      href: { pathname: '/expense/[expenseId]', params: { expenseId: item.id } }
    };
  return {
    content: {
      tag: 'Shared',
      title: `${item.from?.displayName ?? 'Member'} paid ${item.to?.displayName ?? 'member'}`,
      subtitle: `${date} · ${item.ledger?.name ?? 'Shared ledger'}`
    },
    href: { pathname: '/payment/[paymentId]', params: { paymentId: item.id } }
  };
}
