import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { PersonalTransaction } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ApiError } from '@/api/transport';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import {
  personalTransactionQuery,
  replacePersonalTransaction
} from '@/features/personal/api';
import { PersonalTransactionEditor } from '@/features/personal/components/personal-transaction-editor';

export default function EditTransactionScreen() {
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();
  const dialog = useDialog();
  const transaction = useQuery(personalTransactionQuery(transactionId));
  // The form edits this snapshot; a background refetch must not change the version it saves against.
  const [snapshot, setSnapshot] = useState<PersonalTransaction | null>(
    transaction.data ?? null
  );
  if (transaction.data && (!snapshot || snapshot.id !== transaction.data.id))
    setSnapshot(transaction.data);
  const profile = useQuery(profileQuery);
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replacePersonalTransaction>[1]) =>
      replacePersonalTransaction(transactionId, body),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409)
        dialog(
          'Transaction changed',
          'Keep your edits, or load the latest revision. Loading replaces the values in this form.',
          [
            { text: 'Keep editing', style: 'cancel' },
            {
              text: 'Load latest',
              onPress: async () => {
                const latest = await transaction.refetch();
                if (latest.data && !latest.error) {
                  setSnapshot(latest.data);
                  replace.reset();
                }
              }
            }
          ],
          { tone: 'warning' }
        );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (transaction.isLoading || profile.isLoading) return <Loading />;
  if (
    transaction.error ||
    profile.error ||
    !transaction.data ||
    !snapshot ||
    !profile.data
  )
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
  if (snapshot.status !== 'ACTIVE')
    return (
      <Screen>
        <ErrorMessage
          error={new Error('Deleted transactions cannot be edited.')}
        />
      </Screen>
    );
  return (
    <View className="flex-1 bg-background">
      <PersonalTransactionEditor
        key={`${snapshot.id}:${snapshot.version}`}
        displayCurrency={profile.data.displayCurrency}
        error={replace.error}
        transaction={snapshot}
        saving={replace.isPending}
        onSave={(body) =>
          replace.mutate({ ...body, expectedVersion: snapshot.version })
        }
      />
    </View>
  );
}
