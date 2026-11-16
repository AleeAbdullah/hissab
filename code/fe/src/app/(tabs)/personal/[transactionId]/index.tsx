import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  DetailHero,
  ErrorMessage,
  Loading,
  Notice,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import {
  deletePersonalTransaction,
  personalTransactionQuery
} from '@/features/personal/api';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function TransactionDetailScreen() {
  const dialog = useDialog();
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const transaction = useQuery(personalTransactionQuery(transactionId));
  const profile = useQuery(profileQuery);
  const remove = useMutation({
    mutationFn: () =>
      deletePersonalTransaction(transactionId, transaction.data!.version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (transaction.isLoading || profile.isLoading) return <Loading />;
  if (transaction.error || profile.error || !transaction.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={
            transaction.error ??
            profile.error ??
            new Error('Transaction not found.')
          }
        />
      </Screen>
    );
  const item = transaction.data;
  return (
    <Screen>
      {remove.error ? <ErrorMessage error={remove.error} /> : null}
      <DetailHero
        icon={CATEGORY_ICONS[item.category.code]}
        title={item.description}
        amount={`${item.type === 'INCOME' ? '+' : ''}${formatMinorAmount(
          item.amountMinor,
          profile.data.displayCurrency
        )}`}
        meta={`${item.type === 'INCOME' ? 'Income' : 'Expense'} · ${formatDate(item.occurredAt)}`}
        deleted={item.status === 'DELETED'}
        positive={item.type === 'INCOME'}
      />
      {item.status === 'DELETED' ? (
        <Notice title="Deleted transaction">
          This revision remains in your private audit history and no longer
          affects reports.
        </Notice>
      ) : null}
      <View className="gap-2">
        <SectionLabel>DETAILS</SectionLabel>
        <Card>
          <Row title="Category" detail={item.category.name} />
          {item.merchantOrSource ? (
            <Row
              title={item.type === 'INCOME' ? 'Source' : 'Merchant'}
              detail={item.merchantOrSource}
            />
          ) : null}
          {item.notes ? <Row title="Notes" subtitle={item.notes} /> : null}
        </Card>
      </View>
      {item.status === 'ACTIVE' ? (
        <View className="gap-2">
          <Link
            href={{
              pathname: '/personal/[transactionId]/edit',
              params: { transactionId }
            }}
            asChild
          >
            <Button variant="outline" role="link">
              <Text>Edit transaction</Text>
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
                'Delete transaction?',
                'This removes its current effect from your reports and keeps an auditable revision.',
                [
                  { text: 'Keep transaction', style: 'cancel' },
                  {
                    text: 'Delete transaction',
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
              <Text>Delete transaction</Text>
            )}
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}
