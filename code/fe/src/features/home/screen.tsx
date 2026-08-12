import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { Link, router, Stack } from 'expo-router';
import { Alert, RefreshControl, View } from 'react-native';

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
import { formatMinorAmount } from '@/features/balances/format';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { homeQuery } from './api';

type AmountTone = 'positive' | 'negative' | 'neutral';

export function HomeScreen() {
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const home = useQuery(homeQuery);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Home',
          headerLargeTitle: true,
          headerShadowVisible: false,
          headerRight: () => (
            <Text className="font-serif text-xl text-foreground">Hissab</Text>
          )
        }}
      />
      {home.isLoading ? (
        <Loading />
      ) : home.error || !home.data ? (
        <Screen>
          <ErrorMessage
            error={home.error ?? new Error('Home is unavailable.')}
          />
        </Screen>
      ) : (
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
          <Summary home={home.data} />
          <View className="gap-2">
            <SectionLabel>RECENT ACTIVITY</SectionLabel>
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
          <Text
            selectable
            className="text-[13px] leading-[18px] text-muted-foreground"
          >
            Personal entries are private. Shared activity is visible only to the
            people in that ledger.
          </Text>
        </Screen>
      )}
    </>
  );
}

function Summary({ home }: { home: Home }) {
  const sharedNet = BigInt(home.shared.totalNetMinor);
  const sharedAmount =
    sharedNet < 0n ? (-sharedNet).toString() : home.shared.totalNetMinor;
  const personalNet = BigInt(home.personal.monthNetMinor);
  const personalTone: AmountTone =
    personalNet > 0n ? 'positive' : personalNet < 0n ? 'negative' : 'neutral';
  const sharedTone: AmountTone =
    sharedNet > 0n ? 'positive' : sharedNet < 0n ? 'negative' : 'neutral';
  const personalAmount = formatMinorAmount(
    home.personal.monthNetMinor,
    home.currency
  );
  const sharedAmountLabel = formatMinorAmount(sharedAmount, home.currency);
  const sharedDirection =
    sharedNet > 0n ? 'You’re owed' : sharedNet < 0n ? 'You owe' : 'Settled';
  const settleUp = () =>
    Alert.alert(
      'Choose a balance to settle',
      'Open the friend or group where you need to record the payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Friends', onPress: () => router.push('/friends') },
        { text: 'Groups', onPress: () => router.push('/groups') }
      ]
    );
  const personalFront = (
    <View className="flex-1 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text selectable className="flex-1 text-xl font-bold leading-[26px]">
          Personal
        </Text>
        <CardAmount amount={personalAmount} tone={personalTone} />
      </View>
      <View className="mt-auto flex-row flex-wrap gap-2 pr-[52px]">
        <CardAction href="/personal-transaction" title="Add entry" />
        <CardAction href="/personal" title="View personal" />
      </View>
    </View>
  );
  const sharedFront = (
    <View className="flex-1 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <Text selectable className="flex-1 text-xl font-bold leading-[26px]">
          {sharedDirection}
        </Text>
        <CardAmount amount={sharedAmountLabel} tone={sharedTone} />
      </View>
      <View className="mt-auto flex-row flex-wrap gap-2 pr-[52px]">
        {sharedNet < 0n ? (
          <CardAction onPress={settleUp} title="Settle up" />
        ) : (
          <CardAction href="/activity" title="View" />
        )}
      </View>
    </View>
  );
  return (
    <StackedCards
      cards={[
        {
          id: 'personal',
          frontContent: personalFront,
          backContent: (
            <SummaryBack
              title="Personal"
              amount={personalAmount}
              tone={personalTone}
            />
          ),
          accessibilityLabel: 'Bring Personal card to front',
          className: 'border border-border bg-card'
        },
        {
          id: 'shared',
          frontContent: sharedFront,
          backContent: (
            <SummaryBack
              title={sharedDirection}
              amount={sharedAmountLabel}
              tone={sharedTone}
            />
          ),
          accessibilityLabel: 'Bring balance card to front',
          className: 'border border-border bg-card'
        }
      ]}
    />
  );
}

function SummaryBack({
  title,
  amount,
  tone
}: {
  title: string;
  amount: string;
  tone: AmountTone;
}) {
  return (
    <View className="min-h-14 flex-row items-center justify-between gap-3 px-4">
      <Text selectable numberOfLines={1} className="flex-1 text-lg font-bold">
        {title}
      </Text>
      <CardAmount amount={amount} tone={tone} compact />
    </View>
  );
}

function CardAmount({
  amount,
  tone,
  compact
}: {
  amount: string;
  tone: AmountTone;
  compact?: boolean;
}) {
  return (
    <Text
      selectable
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      numberOfLines={1}
      className={cn(
        'max-w-[58%] text-right font-bold tabular-nums',
        compact ? 'text-xl leading-[26px]' : 'text-[28px] leading-[34px]',
        tone === 'positive'
          ? 'text-positive'
          : tone === 'negative'
            ? 'text-destructive'
            : 'text-foreground'
      )}
    >
      {amount}
    </Text>
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
      variant="secondary"
      role={href ? 'link' : 'button'}
      onPress={onPress}
    >
      <Text className="text-[15px] text-primary">{title}</Text>
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
  const tone: AmountTone =
    item.kind === 'PERSONAL_INCOME'
      ? 'positive'
      : item.kind === 'PERSONAL_EXPENSE'
        ? 'negative'
        : 'neutral';
  const personal = item.kind.startsWith('PERSONAL');
  return (
    <Link href={href} asChild>
      <Button
        variant="ghost"
        role="link"
        accessibilityLabel={`${content.tag}. ${content.title}. ${content.subtitle}. ${formatMinorAmount(item.amountMinor, currency)}`}
        className="min-h-[68px] w-full flex-row items-center justify-start gap-3 rounded-none border-b border-border p-3"
      >
        <View
          className={cn(
            'min-w-[62px] rounded-lg px-2 py-1',
            personal ? 'bg-accent' : 'bg-muted'
          )}
        >
          <Text
            selectable
            className={cn(
              'text-[11px] font-bold leading-[14px]',
              personal ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            {content.tag}
          </Text>
        </View>
        <View className="flex-1 gap-px">
          <Text selectable className="text-base font-semibold leading-[22px]">
            {content.title}
          </Text>
          <Text
            selectable
            className="text-[13px] leading-[18px] text-muted-foreground"
          >
            {content.subtitle}
          </Text>
        </View>
        <Text
          selectable
          className={cn(
            'max-w-[30%] text-right text-[15px] font-semibold tabular-nums leading-5',
            tone === 'positive'
              ? 'text-positive'
              : tone === 'negative'
                ? 'text-destructive'
                : 'text-foreground'
          )}
        >
          {formatMinorAmount(item.amountMinor, currency)}
        </Text>
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
