import { Link, router } from 'expo-router';
import { ChevronRight, CircleCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { LedgerBalances } from '@/api/contracts';
import { AmountText, Card, ErrorMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { BalanceReminder } from '@/features/balances/components/balance-reminder';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import { useLedgerDraft, type LedgerDraft } from '@/features/ledger/draft';
import { settleUpDraft } from '@/features/ledger/settle';
import { isolate } from '@/i18n';
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
  const { t } = useTranslation(['ledger', 'common']);
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
        ? t('owesYou', {
            name: isolate(others[0]?.displayName ?? t('yourFriend'))
          })
        : t('youOwe', {
            name: isolate(others[0]?.displayName ?? t('yourFriend'))
          })
      : own > 0n
        ? t('youReOwed')
        : own < 0n
          ? t('youOwe2')
          : t('allSettled');
  const canSettle =
    canRecord && own !== 0n && (direct || Boolean(viewerSuggestions?.length));
  const settle = () => {
    startDraft({
      ...draft,
      settlement: settleUpDraft(balances, draft, direct)
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
        <View className="flex-row items-center gap-2">
          {own === 0n ? (
            <Icon as={CircleCheck} size={20} className="text-positive" />
          ) : null}
          <Text selectable className="flex-1 text-base font-semibold">
            {direction}
          </Text>
        </View>
        {own !== 0n ? (
          <AmountText
            className={`text-[32px] font-semibold leading-[38px] ${own > 0n ? 'text-positive' : 'text-destructive'}`}
          >
            {formatMinorAmount(
              (own < 0n ? -own : own).toString(),
              draft.displayCurrency
            )}
          </AmountText>
        ) : null}
        {direct && own === 0n ? (
          <Text
            selectable
            className="text-[15px] leading-[22px] text-muted-foreground"
          >
            {t('betweenTheTwoOfYouOutsideGroups')}
          </Text>
        ) : null}
        {!direct ? (
          <Text
            selectable
            className="text-[15px] leading-[22px] text-muted-foreground"
          >
            {openCount
              ? t('openMembers', { count: openCount })
              : t('everyoneInThisGroupIsSettled')}
          </Text>
        ) : null}
        {canSettle || !direct ? (
          <View className="flex-row flex-wrap gap-2">
            {canSettle ? (
              <Button variant="outline" size="compact" onPress={settle}>
                <Text>{t('settleUp')}</Text>
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
                  <Text>{t('balanceDetails')}</Text>
                  <Icon as={ChevronRight} size={20} className="text-primary" />
                </Button>
              </Link>
            ) : null}
          </View>
        ) : null}
        {!direct && suggestions === null ? (
          <>
            <ErrorMessage
              error={new Error(t('groupBalancesDoNotAddUpToZero'))}
            />
            {canRecord ? (
              <Button variant="ghost" role="link" onPress={differentPayment}>
                <Text>{t('recordADifferentPayment')}</Text>
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
