import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Card, ErrorMessage, Loading, Notice, Row, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { formatMinorAmount } from '@/features/balances/format';
import { homeQuery } from '@/features/home/api';
import { deletePersonalTransaction, personalTransactionQuery } from '@/features/personal/api';

export default function TransactionDetailScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const transaction = useQuery(personalTransactionQuery(transactionId));
  const profile = useQuery(profileQuery);
  const remove = useMutation({
    mutationFn: () => deletePersonalTransaction(transactionId, transaction.data!.version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
      router.back();
    },
  });
  if (transaction.isLoading || profile.isLoading) return <Loading />;
  if (transaction.error || profile.error || !transaction.data || !profile.data) return <Screen><ErrorMessage error={transaction.error ?? profile.error ?? new Error('Transaction not found.')} /></Screen>;
  const item = transaction.data;
  return (
    <Screen>
      {remove.error ? <ErrorMessage error={remove.error} /> : null}
      <SectionLabel>PERSONAL {item.type === 'INCOME' ? 'INCOME' : 'EXPENSE'}</SectionLabel>
      <Card><Row title={item.description} subtitle={`${item.category.name} · ${item.occurredAt.slice(0, 10)}`} detail={formatMinorAmount(item.amountMinor, profile.data.displayCurrency)} /></Card>
      {item.status === 'DELETED' ? <Notice title="Deleted transaction">This revision remains in your private audit history and no longer affects reports.</Notice> : null}
      <View className="gap-2">
        <SectionLabel>DETAILS</SectionLabel>
        <Card>
          <Row title="Category" detail={item.category.name} />
          <Row title={item.type === 'INCOME' ? 'Source' : 'Merchant'} detail={item.merchantOrSource ?? 'Not recorded'} />
          <Row title="Date" detail={item.occurredAt.slice(0, 10)} />
          {item.notes ? <Row title="Notes" subtitle={item.notes} /> : null}
        </Card>
      </View>
      {item.status === 'ACTIVE' ? <View className="gap-2"><Link href={{ pathname: '/personal/[transactionId]/edit', params: { transactionId } }} asChild><Button variant="outline" role="link"><Text>Edit transaction</Text></Button></Link><Button variant="destructiveOutline" disabled={remove.isPending} accessibilityState={{ disabled: remove.isPending, busy: remove.isPending }} onPress={() => Alert.alert('Delete transaction?', 'This removes its current effect from your reports and keeps an auditable revision.', [{ text: 'Keep transaction', style: 'cancel' }, { text: 'Delete transaction', style: 'destructive', onPress: () => remove.mutate() }])}>{remove.isPending ? <ActivityIndicator className="text-destructive" /> : <Text>Delete transaction</Text>}</Button></View> : null}
    </Screen>
  );
}
