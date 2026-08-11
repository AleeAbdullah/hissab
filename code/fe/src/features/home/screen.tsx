import { useQuery } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { Link, router, Stack } from 'expo-router';
import { Alert, Pressable, RefreshControl, Text, View } from 'react-native';

import type { Home, HomeRecentItem } from '@/api/contracts';
import { StackedCards } from '@/components/stacked-cards';
import { Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { formatMinorAmount } from '@/features/balances/format';
import { activityDayLabel } from '@/features/activity/presentation';
import { useAppTheme } from '@/theme/theme';

import { homeQuery } from './api';

export function HomeScreen() {
  const { colors } = useAppTheme();
  const home = useQuery(homeQuery);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Home',
          headerLargeTitle: true,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.canvas },
          headerRight: () => <Text style={{ color: colors.text, fontFamily: 'serif', fontSize: 20 }}>Hissab</Text>,
        }}
      />
      {home.isLoading ? <Loading /> : home.error || !home.data ? (
        <Screen><ErrorMessage error={home.error ?? new Error('Home is unavailable.')} /></Screen>
      ) : (
        <Screen refreshControl={<RefreshControl refreshing={home.isRefetching} onRefresh={() => home.refetch()} tintColor={colors.brand} colors={[colors.brand]} />}>
          <Summary home={home.data} />
          <View style={{ gap: 8 }}>
            <SectionLabel>RECENT ACTIVITY</SectionLabel>
            {home.data.recent.length ? <Card>{[...home.data.recent].sort(byNewest).map((item) => <RecentRow key={`${item.kind}-${item.id}-${item.createdAt}`} item={item} currency={home.data.currency} />)}</Card> : (
              <Text selectable style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>No recent activity yet.</Text>
            )}
          </View>
          <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
            Personal entries are private. Shared activity is visible only to the people in that ledger.
          </Text>
        </Screen>
      )}
    </>
  );
}

function Summary({ home }: { home: Home }) {
  const { colors } = useAppTheme();
  const sharedNet = BigInt(home.shared.totalNetMinor);
  const sharedAmount = sharedNet < 0n ? (-sharedNet).toString() : home.shared.totalNetMinor;
  const personalNet = BigInt(home.personal.monthNetMinor);
  const personalColor = personalNet > 0n ? colors.positive : personalNet < 0n ? colors.negative : colors.text;
  const sharedColor = sharedNet > 0n ? colors.positive : sharedNet < 0n ? colors.negative : colors.text;
  const personalAmount = formatMinorAmount(home.personal.monthNetMinor, home.currency);
  const sharedAmountLabel = formatMinorAmount(sharedAmount, home.currency);
  const sharedDirection = sharedNet > 0n ? 'You’re owed' : sharedNet < 0n ? 'You owe' : 'Settled';
  const settleUp = () => Alert.alert(
    'Choose a balance to settle',
    'Open the friend or group where you need to record the payment.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Friends', onPress: () => router.push('/friends') },
      { text: 'Groups', onPress: () => router.push('/groups') },
    ],
  );
  const personalFront = (
    <View style={summaryFrontStyle}>
      <View style={summaryCardHeaderStyle}>
        <Text selectable style={summaryTitleStyle(colors.text)}>Personal</Text>
        <CardAmount amount={personalAmount} color={personalColor} />
      </View>
      <View style={summaryActionsStyle}>
        <CardAction href="/personal-transaction" title="Add entry" />
        <CardAction href="/personal" title="View personal" />
      </View>
    </View>
  );
  const sharedFront = (
    <View style={summaryFrontStyle}>
      <View style={summaryCardHeaderStyle}>
        <Text selectable style={summaryTitleStyle(colors.text)}>{sharedDirection}</Text>
        <CardAmount amount={sharedAmountLabel} color={sharedColor} />
      </View>
      <View style={summaryActionsStyle}>
        {sharedNet < 0n ? <CardAction onPress={settleUp} title="Settle up" /> : <CardAction href="/activity" title="View" />}
      </View>
    </View>
  );
  const personalBack = <SummaryBack title="Personal" amount={personalAmount} amountColor={personalColor} />;
  const sharedBack = <SummaryBack title={sharedDirection} amount={sharedAmountLabel} amountColor={sharedColor} />;

  return (
    <StackedCards
      cards={[
        { id: 'personal', frontContent: personalFront, backContent: personalBack, accessibilityLabel: 'Bring Personal card to front', style: summaryCardStyle(colors) },
        { id: 'shared', frontContent: sharedFront, backContent: sharedBack, accessibilityLabel: 'Bring balance card to front', style: summaryCardStyle(colors) },
      ]}
    />
  );
}

function SummaryBack({ title, amount, amountColor }: { title: string; amount: string; amountColor: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <Text selectable numberOfLines={1} style={{ flex: 1, color: colors.text, fontSize: 18, lineHeight: 24, fontWeight: '700' }}>{title}</Text>
      <CardAmount amount={amount} color={amountColor} compact />
    </View>
  );
}

function CardAmount({ amount, color, compact }: { amount: string; color: string; compact?: boolean }) {
  return (
    <Text selectable adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={{ color, fontSize: compact ? 20 : 28, lineHeight: compact ? 26 : 34, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right', maxWidth: '58%' }}>
      {amount}
    </Text>
  );
}

function CardAction({ href, onPress, title }: { href?: Href; onPress?: () => void; title: string }) {
  const { colors } = useAppTheme();
  const action = (
    <Pressable accessibilityRole={href ? 'link' : 'button'} onPress={onPress} style={{ minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.brand, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
  return href ? <Link href={href} asChild>{action}</Link> : action;
}

function RecentRow({ item, currency }: { item: HomeRecentItem; currency: Home['currency'] }) {
  const { colors } = useAppTheme();
  const content = recentContent(item);
  const amountColor = item.kind === 'PERSONAL_INCOME' ? colors.positive : item.kind === 'PERSONAL_EXPENSE' ? colors.negative : colors.text;

  return (
    <Link href={recentHref(item)} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${content.tag}. ${content.title}. ${content.subtitle}. ${formatMinorAmount(item.amountMinor, currency)}`}
        style={{ minHeight: 68, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider }}
      >
        <View style={{ minWidth: 62, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderCurve: 'continuous', backgroundColor: item.kind.startsWith('PERSONAL') ? colors.brandSubtle : colors.surfaceSubtle }}>
          <Text selectable style={{ color: item.kind.startsWith('PERSONAL') ? colors.brand : colors.secondary, fontSize: 11, lineHeight: 14, fontWeight: '700' }}>{content.tag}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{content.title}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>{content.subtitle}</Text>
        </View>
        <Text selectable style={{ color: amountColor, fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'right', maxWidth: '30%' }}>
          {formatMinorAmount(item.amountMinor, currency)}
        </Text>
      </Pressable>
    </Link>
  );
}

function recentContent(item: HomeRecentItem) {
  const date = activityDayLabel(item.occurredAt);
  if (item.kind === 'PERSONAL_INCOME') return { tag: 'Income', title: item.description ?? item.category?.name ?? 'Income', subtitle: `${date} · ${item.category?.name ?? 'Income'}` };
  if (item.kind === 'PERSONAL_EXPENSE') return { tag: 'Expense', title: item.description ?? item.category?.name ?? 'Expense', subtitle: `${date} · ${item.category?.name ?? 'Expense'}` };
  if (item.kind === 'SHARED_EXPENSE') return { tag: 'Shared', title: item.actor ? `${item.actor.displayName} added ${item.description ?? 'an expense'}` : item.description ?? 'Shared expense', subtitle: `${date} · ${item.ledger?.name ?? 'Shared ledger'}` };
  return { tag: 'Shared', title: `${item.from?.displayName ?? 'Member'} paid ${item.to?.displayName ?? 'member'}`, subtitle: `${date} · ${item.ledger?.name ?? 'Shared ledger'}` };
}

function recentHref(item: HomeRecentItem): Href {
  if (item.kind === 'PERSONAL_INCOME' || item.kind === 'PERSONAL_EXPENSE') return { pathname: '/personal/[transactionId]', params: { transactionId: item.id } };
  if (item.kind === 'SHARED_EXPENSE') return { pathname: '/expense/[expenseId]', params: { expenseId: item.id } };
  return { pathname: '/payment/[paymentId]', params: { paymentId: item.id } };
}

function byNewest(left: HomeRecentItem, right: HomeRecentItem) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function summaryCardStyle(colors: ReturnType<typeof useAppTheme>['colors']) {
  return {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
  };
}

const summaryCardHeaderStyle = { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 } as const;
const summaryFrontStyle = { flex: 1, padding: 16 } as const;
const summaryActionsStyle = { marginTop: 'auto', paddingRight: 52, flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const;

function summaryTitleStyle(color: string) {
  return { flex: 1, color, fontSize: 20, lineHeight: 26, fontWeight: '700' as const };
}
