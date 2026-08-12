import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  ErrorMessage,
  Loading,
  Notice,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { formatMinorAmount } from '@/features/balances/format';
import { homeQuery } from '@/features/home/api';
import { deleteSettlement, settlementQuery } from '@/features/settlements/api';

export default function PaymentDetailScreen() {
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const settlement = useQuery(settlementQuery(paymentId));
  const profile = useQuery(profileQuery);
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
  const editable =
    settlement.data.status === 'ACTIVE' &&
    settlement.data.createdByUserId === profile.data.id;
  return (
    <Screen>
      {remove.error || balances.error ? (
        <ErrorMessage error={remove.error ?? balances.error} />
      ) : null}
      <SectionLabel>EXTERNAL PAYMENT</SectionLabel>
      <Card>
        <Row
          title={`${names.get(settlement.data.fromUserId) ?? 'Member'} paid ${names.get(settlement.data.toUserId) ?? 'member'}`}
          subtitle={settlement.data.occurredAt.slice(0, 10)}
          detail={formatMinorAmount(
            settlement.data.amountMinor,
            profile.data.displayCurrency
          )}
        />
      </Card>
      <Notice title="Recorded only">
        This documents money paid elsewhere. Hissab did not move money.
      </Notice>
      {settlement.data.status === 'DELETED' ? (
        <Notice title="Deleted payment">
          This record remains in Hissab’s audit history and no longer affects
          balances.
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
              Alert.alert(
                'Delete payment?',
                'This reverses its balance effect. It does not reverse any money paid outside Hissab.',
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
