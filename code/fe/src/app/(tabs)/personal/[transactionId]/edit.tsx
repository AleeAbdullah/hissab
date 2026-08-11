import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import { PersonalTransactionEditor } from '@/features/personal/components/personal-transaction-editor';
import { personalTransactionQuery, replacePersonalTransaction } from '@/features/personal/api';

export default function EditTransactionScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const transaction = useQuery(personalTransactionQuery(transactionId));
  const profile = useQuery(profileQuery);
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replacePersonalTransaction>[1]) => replacePersonalTransaction(transactionId, body),
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
  if (transaction.data.status !== 'ACTIVE') return <Screen><ErrorMessage error={new Error('Deleted transactions cannot be edited.')} /></Screen>;
  return <Screen>{replace.error ? <ErrorMessage error={replace.error} /> : null}<PersonalTransactionEditor key={transaction.data.id} displayCurrency={profile.data.displayCurrency} transaction={transaction.data} saving={replace.isPending} onSave={(body) => replace.mutate({ ...body, expectedVersion: transaction.data!.version })} /></Screen>;
}
