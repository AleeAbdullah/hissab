import { Link, router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';

import type { LedgerBalances } from '@/api/contracts';
import { Card, ErrorMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { BalanceReminder } from '@/features/balances/components/balance-reminder';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import { useLedgerDraft, type LedgerDraft } from '@/features/ledger/draft';
import { suggestedSettlement } from '@/features/settlements/form';
import { formatMinorAmount } from '@/lib/money';

export function LedgerBalancePanel({
  balances,
  draft,
  canRecord,
  direct = false
}: {
  balances: LedgerBalances;
  draft: LedgerDraft;
  canRecord: boolean;
  direct?: boolean;
}) {
  const { startDraft } = useLedgerDraft();
  const own = BigInt(
    balances.members.find((member) => member.userId === draft.currentUserId)
      ?.netMinor ?? '0'
  );
  const others = balances.members.filter(
    (member) => member.userId !== draft.currentUserId
  );
  const candidates = others.filter(
    (member) =>
      draft.members.some((active) => active.userId === member.userId) &&
      (own < 0n ? BigInt(member.netMinor) > 0n : BigInt(member.netMinor) < 0n)
  );
  const openCount = others.filter(
    (member) => BigInt(member.netMinor) !== 0n
  ).length;
  const suggestions = direct ? [] : simplifyLedgerBalances(balances.members);
  const viewerSuggestions = suggestions?.filter(
    (payment) =>
      (payment.fromUserId === draft.currentUserId ||
        payment.toUserId === draft.currentUserId) &&
      draft.members.some((member) => member.userId === payment.fromUserId) &&
      draft.members.some((member) => member.userId === payment.toUserId)
  );
  const direction =
    direct && own !== 0n
      ? own > 0n
        ? `${others[0]?.displayName ?? 'Your friend'} owes you`
        : `You owe ${others[0]?.displayName ?? 'your friend'}`
      : own > 0n
        ? "You're owed"
        : own < 0n
          ? 'You owe'
          : "You're settled";
  const settle = () => {
    const other = direct ? candidates[0] : undefined;
    startDraft({
      ...draft,
      settlement: {
        amount: other
          ? (suggestedSettlement(own.toString(), other.netMinor) ?? '')
          : '',
        fromUserId: own < 0n ? draft.currentUserId : (other?.userId ?? ''),
        toUserId: own > 0n ? draft.currentUserId : (other?.userId ?? '')
      }
    });
    router.push('/settlement');
  };
  const differentPayment = () => {
    startDraft({
      ...draft,
      settlement: { amount: '', fromUserId: '', toUserId: '' }
    });
    router.push('/settlement');
  };
  return (
    <Card>
      <View className="gap-3 p-4">
        <Text selectable className="text-base font-semibold">
          {direction}
        </Text>
        <Text
          selectable
          className={`text-[32px] font-semibold leading-[38px] ${own > 0n ? 'text-positive' : own < 0n ? 'text-destructive' : 'text-foreground'}`}
        >
          {formatMinorAmount(
            (own < 0n ? -own : own).toString(),
            draft.displayCurrency
          )}
        </Text>
        {!direct ? (
          <Text
            selectable
            className="text-[15px] leading-[22px] text-muted-foreground"
          >
            Your net balance in this group.{' '}
            {openCount
              ? openCount === 1
                ? '1 other member has an open balance.'
                : `${openCount} other members have open balances.`
              : 'Everyone is settled.'}
          </Text>
        ) : null}
        <View className="flex-row flex-wrap gap-2">
          {canRecord &&
          own !== 0n &&
          (direct || Boolean(viewerSuggestions?.length)) ? (
            <Button variant="outline" size="compact" onPress={settle}>
              <Text>Mark settled</Text>
            </Button>
          ) : null}
          {!direct ? (
            <Link
              href={{
                pathname: '/groups/[groupId]/balances',
                params: { groupId: draft.ledgerId }
              }}
              asChild
            >
              <Button
                variant="link"
                size="compact"
                role="link"
                className="justify-start px-0"
              >
                <Text>Balance details</Text>
                <Icon as={ChevronRight} size={20} className="text-primary" />
              </Button>
            </Link>
          ) : null}
        </View>
        {!direct && suggestions === null ? (
          <>
            <ErrorMessage
              error={new Error('Group balances do not add up to zero.')}
            />
            {canRecord ? (
              <Button variant="ghost" role="link" onPress={differentPayment}>
                <Text>Record a different payment</Text>
              </Button>
            ) : null}
          </>
        ) : null}
        {direct && canRecord && own > 0n && candidates[0] ? (
          <BalanceReminder
            ledgerId={draft.ledgerId}
            ledgerName={draft.ledgerName}
            member={candidates[0]}
          />
        ) : null}
      </View>
    </Card>
  );
}
