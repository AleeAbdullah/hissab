import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeftRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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
import { isolate } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function PaymentDetailScreen() {
  const { t } = useTranslation(['settlements', 'ledger', 'common']);
  const dialog = useDialog();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const settlement = useQuery(settlementQuery(paymentId));
  const profile = useQuery(profileQuery);
  const ledgerName = useLedgerName(
    settlement.data?.ledgerId,
    t('sharedLedger')
  );
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
          fallback={t(
            settlement.error || profile.error ? 'common:error' : 'notFound'
          )}
          error={settlement.error ?? profile.error ?? new Error(t('notFound'))}
        />
      </Screen>
    );
  const names = new Map(
    balances.data?.members.map((member) => [member.userId, member.displayName])
  );
  const person = (userId: string, you: string) =>
    userId === profile.data.id ? you : (names.get(userId) ?? t('member'));
  const editable =
    settlement.data.status === 'ACTIVE' &&
    settlement.data.createdByUserId === profile.data.id;
  return (
    <Screen>
      {remove.error || balances.error ? (
        <ErrorMessage
          error={remove.error ?? balances.error}
          fallback={t('common:error')}
        />
      ) : null}
      <DetailHero
        icon={ArrowLeftRight}
        title={
          settlement.data.toUserId === profile.data.id
            ? t('ledger:paidYou', {
                name: isolate(person(settlement.data.fromUserId, t('you')))
              })
            : settlement.data.fromUserId === profile.data.id
              ? t('ledger:youPaidPerson', {
                  recipient: isolate(person(settlement.data.toUserId, t('you')))
                })
              : t('paidTitle', {
                  from: isolate(person(settlement.data.fromUserId, t('you'))),
                  to: isolate(person(settlement.data.toUserId, t('you')))
                })
        }
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
        {t('recordedOnly')}
      </Text>
      {settlement.data.status === 'DELETED' ? (
        <Notice title={t('deletedTitle')}>{t('deletedBody')}</Notice>
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
              <Text>{t('editPayment')}</Text>
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
                t('deleteQuestion'),
                t(ledgerName ? 'deleteLedgerBody' : 'deleteBody', {
                  from: isolate(
                    names.get(settlement.data.fromUserId) ?? t('member')
                  ),
                  to: isolate(
                    names.get(settlement.data.toUserId) ?? t('member')
                  ),
                  amount: isolate(
                    formatMinorAmount(
                      settlement.data.amountMinor,
                      profile.data.displayCurrency
                    )
                  ),
                  ledger: isolate(ledgerName ?? '')
                }),
                [
                  { text: t('keepPayment'), style: 'cancel' },
                  {
                    text: t('deletePayment'),
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
              <Text>{t('deletePayment')}</Text>
            )}
          </Button>
        </>
      ) : null}
    </Screen>
  );
}
