import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  DetailHero,
  ErrorMessage,
  Loading,
  Notice,
  Screen
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { homeQuery } from '@/features/home/api';
import { useLedgerName } from '@/features/ledger/use-ledger-name';
import { deleteSettlement, settlementQuery } from '@/features/settlements/api';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function PaymentDetailScreen() {
  const dialog = useDialog();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const settlement = useQuery(settlementQuery(paymentId));
  const profile = useQuery(profileQuery);
  const ledgerName = useLedgerName(settlement.data?.ledgerId);
  const balances = useQuery({
    ...ledgerBalancesQuery(settlement.data?.ledgerId ?? ''),
    enabled: Boolean(settlement.data)
  });
  const remove = useMutation({
    mutationFn: () => deleteSettlement(paymentId, settlement.data!.version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', settlement.data!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (settlement.isLoading || profile.isLoading) return <Loading />;
  if (settlement.error || profile.error || !settlement.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={
            settlement.error ?? profile.error ?? new Error('Payment not found.')
          }
        />
      </Screen>
    );
  const names = new Map(
    balances.data?.members.map((member) => [member.userId, member.displayName])
  );
  const person = (userId: string, you: string) =>
    userId === profile.data.id ? you : (names.get(userId) ?? 'Member');
  const editable =
    settlement.data.status === 'ACTIVE' &&
    settlement.data.createdByUserId === profile.data.id;
  return (
    <Screen>
      {remove.error || balances.error ? (
        <ErrorMessage error={remove.error ?? balances.error} />
      ) : null}
      <DetailHero
        icon={ArrowLeftRight}
        title={`${person(settlement.data.fromUserId, 'You')} paid ${person(settlement.data.toUserId, 'you')}`}
        amount={formatMinorAmount(
          settlement.data.amountMinor,
          profile.data.displayCurrency
        )}
        meta={[ledgerName, formatDate(settlement.data.occurredAt)]
          .filter(Boolean)
          .join(' · ')}
        deleted={settlement.data.status === 'DELETED'}
      />
      <Text
        selectable
        className="text-center text-[13px] leading-[18px] text-muted-foreground"
      >
        Recorded only. This payment happened outside Tally Stick.
      </Text>
      {settlement.data.status === 'DELETED' ? (
        <Notice title="Deleted payment">
          This record remains in Tally Stick’s audit history and no longer
          affects balances.
        </Notice>
      ) : null}
      {editable ? (
        <>
          <Link
            href={{
              pathname: '/payment/[paymentId]/edit',
              params: { paymentId }
            }}
            asChild
          >
            <Button variant="outline" role="link">
              <Text>Edit payment</Text>
            </Button>
          </Link>
          <Button
            variant="destructiveOutline"
            disabled={remove.isPending}
            accessibilityState={{
              disabled: remove.isPending,
              busy: remove.isPending
            }}
            onPress={() =>
              dialog(
                'Delete payment?',
                `Delete the payment from ${names.get(settlement.data.fromUserId) ?? 'Member'} to ${names.get(settlement.data.toUserId) ?? 'member'} (${formatMinorAmount(settlement.data.amountMinor, profile.data.displayCurrency)})${ledgerName ? ` in ${ledgerName}` : ''}? This reverses its balance effect. It does not reverse any money paid outside Tally Stick.`,
                [
                  { text: 'Keep payment', style: 'cancel' },
                  {
                    text: 'Delete payment',
                    style: 'destructive',
                    onPress: () => remove.mutate()
                  }
                ]
              )
            }
          >
            {remove.isPending ? (
              <ActivityIndicator className="text-destructive" />
            ) : (
              <Text>Delete payment</Text>
            )}
          </Button>
        </>
      ) : null}
    </Screen>
  );
}
