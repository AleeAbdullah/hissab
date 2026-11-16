import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { ArrowLeftRight, Shapes } from 'lucide-react-native';
import { RefreshControl, View } from 'react-native';

import type { Home, HomeRecentItem } from '@/api/contracts';
import { Icons } from '@/components/icons';
import {
  AmountText,
  Card,
  DayHeading,
  ErrorMessage,
  IconTile,
  ListRow,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { groupByDay } from '@/features/activity/presentation';
import { homeQuery } from '@/features/home/api';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { absMinor, formatMinorAmount } from '@/lib/money';
import { usePullToRefresh } from '@/lib/pull-to-refresh';
import { useLargeText } from '@/lib/text-scale';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';
import { cn } from '@/lib/utils';

type AmountTone = 'positive' | 'negative' | 'neutral';

const toneClass: Record<AmountTone, string> = {
  positive: 'text-positive',
  negative: 'text-destructive',
  neutral: 'text-foreground'
};

const amountTone = (net: bigint): AmountTone =>
  net > 0n ? 'positive' : net < 0n ? 'negative' : 'neutral';

export default function HomeScreen() {
  const primary = useThemeVariable(THEME_VARIABLES.primaryText);
  const home = useQuery(homeQuery);
  const profile = useQuery(profileQuery);
  const pull = usePullToRefresh(() => home.refetch());
  const largeText = useLargeText();
  if (home.isLoading) return <Loading />;
  if (!home.data)
    return (
      <Screen>
        <ErrorMessage error={home.error ?? new Error('Home is unavailable.')} />
        <Button
          variant="outline"
          disabled={home.isFetching}
          onPress={() => home.refetch()}
        >
          <Text>Try again</Text>
        </Button>
      </Screen>
    );

  const { currency, personal, shared, recent } = home.data;
  const sharedNet = BigInt(shared.totalNetMinor);
  const personalNet = BigInt(personal.monthNetMinor);
  const ledgers = shared.unsettledLedgerCount;
  const sharedDirection =
    sharedNet > 0n
      ? 'You’re owed'
      : sharedNet < 0n
        ? 'You owe'
        : ledgers
          ? 'Evens out'
          : 'All settled';

  return (
    <Screen
      refreshControl={
        <RefreshControl {...pull} tintColor={primary} colors={[primary]} />
      }
    >
      {home.error ? <ErrorMessage error={home.error} /> : null}
      <Card>
        <View className={largeText ? undefined : 'flex-row'}>
          <SummaryHalf
            href="/groups"
            label="Shared"
            amount={formatMinorAmount(absMinor(sharedNet), currency)}
            tone={amountTone(sharedNet)}
            caption={
              ledgers
                ? `${sharedDirection} · ${ledgers} ${ledgers === 1 ? 'balance' : 'balances'}`
                : sharedDirection
            }
          />
          <SummaryHalf
            href="/personal"
            label="This month"
            amount={formatMinorAmount(absMinor(personalNet), currency)}
            tone={amountTone(personalNet)}
            caption={personalNet < 0n ? 'Overspent' : 'Left over'}
            divided
          />
        </View>
      </Card>
      <View className="gap-2">
        <SectionLabel>RECENT</SectionLabel>
        {recent.length ? (
          groupByDay(recent).map((day) => (
            <View key={day.title}>
              <DayHeading>{day.title}</DayHeading>
              {day.items.map((item, index) => (
                <RecentRow
                  key={`${item.kind}-${item.id}-${item.createdAt}`}
                  item={item}
                  currency={currency}
                  viewerId={profile.data?.id}
                  divided={index > 0}
                />
              ))}
            </View>
          ))
        ) : (
          <Text selectable className="leading-6 text-muted-foreground">
            No recent activity yet.
          </Text>
        )}
      </View>
    </Screen>
  );
}

function SummaryHalf({
  href,
  label,
  amount,
  tone,
  caption,
  divided
}: {
  href: Href;
  label: string;
  amount: string;
  tone: AmountTone;
  caption: string;
  divided?: boolean;
}) {
  const largeText = useLargeText();
  return (
    <Link href={href} asChild>
      <Button
        variant="ghost"
        role="link"
        accessibilityLabel={`${label}. ${caption}. ${amount}`}
        className={cn(
          'h-auto flex-1 flex-col items-stretch justify-start gap-0.5 rounded-none p-4',
          divided && (largeText ? 'border-t' : 'border-l'),
          'border-border'
        )}
      >
        <View className="flex-row items-center justify-between gap-1">
          <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
            {label}
          </Text>
          <Icon
            as={Icons.chevronRight}
            size={16}
            className="text-muted-foreground"
          />
        </View>
        <AmountText
          className={cn(
            'text-[22px] font-semibold tabular-nums leading-7',
            toneClass[tone]
          )}
        >
          {amount}
        </AmountText>
        <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
          {caption}
        </Text>
      </Button>
    </Link>
  );
}

function RecentRow({
  item,
  currency,
  viewerId,
  divided
}: {
  item: HomeRecentItem;
  currency: Home['currency'];
  viewerId?: string;
  divided: boolean;
}) {
  const { title, subtitle, amount, tone, href } = recentPresentation(
    item,
    currency,
    viewerId
  );
  return (
    <ListRow
      href={href}
      title={title}
      subtitle={subtitle}
      divided={divided}
      accessibilityLabel={[title, subtitle, amount].filter(Boolean).join('. ')}
      leading={
        <IconTile
          icon={
            item.kind === 'SHARED_SETTLEMENT'
              ? ArrowLeftRight
              : item.category
                ? CATEGORY_ICONS[item.category.code]
                : Shapes
          }
        />
      }
      trailing={
        amount ? (
          <Text
            selectable
            className={cn(
              'text-base font-semibold tabular-nums leading-[22px]',
              toneClass[tone]
            )}
          >
            {amount}
          </Text>
        ) : null
      }
    />
  );
}

function recentPresentation(
  item: HomeRecentItem,
  currency: Home['currency'],
  viewerId?: string
): {
  title: string;
  subtitle: string;
  amount: string | null;
  tone: AmountTone;
  href: Href;
} {
  const where = item.ledger?.name ?? 'Shared ledger';
  const deleted = item.eventType?.endsWith('_DELETED') ?? false;
  const edited = item.eventType?.endsWith('_REPLACED') ? ' · edited' : '';
  const money = (minor: string) => formatMinorAmount(minor, currency);
  if (item.kind === 'PERSONAL_INCOME' || item.kind === 'PERSONAL_EXPENSE') {
    const income = item.kind === 'PERSONAL_INCOME';
    const tag = income ? 'Income' : 'Expense';
    return {
      title: item.description ?? item.category?.name ?? tag,
      subtitle: item.category?.name ?? tag,
      amount: income ? `+${money(item.amountMinor)}` : money(item.amountMinor),
      tone: income ? 'positive' : 'neutral',
      href: {
        pathname: '/personal/[transactionId]',
        params: { transactionId: item.id }
      }
    };
  }
  if (item.kind === 'SHARED_EXPENSE')
    return {
      title: item.description ?? 'Shared expense',
      subtitle: `${deleted ? 'Deleted' : 'Your share'} · ${where}${edited}`,
      // A snapshot saved before shareMinor existed shows no amount until the refetch lands.
      amount:
        deleted || item.shareMinor == null ? null : money(item.shareMinor),
      tone: 'neutral',
      href: { pathname: '/expense/[expenseId]', params: { expenseId: item.id } }
    };
  const name = (user: HomeRecentItem['from'], fallback: string) =>
    !user ? fallback : user.userId === viewerId ? 'You' : user.displayName;
  const to = name(item.to, 'member');
  return {
    title: `${name(item.from, 'Member')} paid ${to === 'You' ? 'you' : to}`,
    subtitle: `${deleted ? 'Payment deleted' : 'Payment'} · ${where}${edited}`,
    amount: deleted ? null : money(item.amountMinor),
    tone: 'neutral',
    href: { pathname: '/payment/[paymentId]', params: { paymentId: item.id } }
  };
}
