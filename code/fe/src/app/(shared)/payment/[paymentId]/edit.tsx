import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Settlement } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ApiError } from '@/api/transport';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { homeQuery } from '@/features/home/api';
import { replaceSettlement, settlementQuery } from '@/features/settlements/api';
import {
  SettlementEditor,
  type SettlementFormDraft
} from '@/features/settlements/components/settlement-editor';

export default function EditPaymentScreen() {
  const { t } = useTranslation(['settlements', 'common']);
  const dialog = useDialog();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const settlement = useQuery(settlementQuery(paymentId));
  const [snapshot, setSnapshot] = useState<Settlement | null>(
    settlement.data ?? null
  );
  if (settlement.data && (!snapshot || snapshot.id !== settlement.data.id))
    setSnapshot(settlement.data);
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const submitting = useRef(false);
  const baseline = useRef<string | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const onDraftChange = useCallback((value: SettlementFormDraft | null) => {
    const serialized = JSON.stringify(value);
    baseline.current ??= serialized;
    setDirty(serialized !== baseline.current);
  }, []);
  const profile = useQuery(profileQuery);
  const balances = useQuery({
    ...ledgerBalancesQuery(settlement.data?.ledgerId ?? ''),
    enabled: Boolean(settlement.data)
  });
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replaceSettlement>[1]) =>
      replaceSettlement(paymentId, body),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409)
        dialog(
          t('changed'),
          t('conflict'),
          [
            { text: t('keepEditing'), style: 'cancel' },
            {
              text: t('loadLatest'),
              onPress: async () => {
                if (submitting.current) return;
                setLoadingLatest(true);
                try {
                  const latest = await settlement.refetch();
                  if (latest.data && !latest.error) {
                    baseline.current = undefined;
                    setDirty(false);
                    setSnapshot(latest.data);
                    replace.reset();
                  }
                } finally {
                  setLoadingLatest(false);
                }
              }
            }
          ],
          { tone: 'warning' }
        );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', snapshot!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: settlementQuery(paymentId).queryKey
        }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] })
      ]);
      allowExit.current = true;
      router.back();
    },
    onSettled: () => {
      submitting.current = false;
    }
  });
  usePreventRemove(dirty || replace.isPending || loadingLatest, ({ data }) => {
    if (allowExit.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (submitting.current || replace.isPending || loadingLatest) return;
    dialog(t('discardQuestion'), t('discardBody'), [
      { text: t('keepEditing'), style: 'cancel' },
      {
        text: t('discardChanges'),
        style: 'destructive',
        onPress: () => {
          allowExit.current = true;
          navigation.dispatch(data.action);
        }
      }
    ]);
  });
  const busy = replace.isPending || replace.isSuccess || loadingLatest;
  if (
    (settlement.isLoading && !settlement.data) ||
    (profile.isLoading && !profile.data) ||
    (balances.isLoading && !balances.data) ||
    (settlement.data && !snapshot)
  )
    return <Loading />;
  if (!settlement.data || !profile.data || !balances.data)
    return (
      <Screen>
        <ErrorMessage
          fallback={t('common:error')}
          error={
            settlement.error ??
            profile.error ??
            balances.error ??
            new Error(t('notFound'))
          }
        />
      </Screen>
    );
  const members = balances.data.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName
  }));
  if (
    settlement.data.status !== 'ACTIVE' ||
    settlement.data.createdByUserId !== profile.data.id
  )
    return (
      <Screen>
        <ErrorMessage
          fallback={t('onlyRecorder')}
          error={new Error(t('onlyRecorder'))}
        />
      </Screen>
    );
  return (
    <>
      <Stack.Screen
        options={{
          title: t('editPayment'),
          gestureEnabled: !busy,
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              disabled={busy}
              accessibilityLabel={t('closeEditor')}
              onPress={() => router.back()}
            >
              <Icon as={X} size={22} />
            </Button>
          )
        }}
      />
      <SettlementEditor
        key={`${snapshot?.id}:${snapshot?.version}`}
        error={
          replace.error ?? settlement.error ?? profile.error ?? balances.error
        }
        balances={balances.data}
        currentUserId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
        members={members}
        saving={busy}
        onDraftChange={onDraftChange}
        onDiscard={() => router.back()}
        settlement={snapshot ?? settlement.data}
        onSave={(body) => {
          if (submitting.current || busy) return;
          submitting.current = true;
          replace.mutate({ ...body, expectedVersion: snapshot!.version });
        }}
      />
    </>
  );
}
