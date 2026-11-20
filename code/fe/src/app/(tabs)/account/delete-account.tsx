import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { clearTokens } from '@/api/session-store';
import { ApiError, idempotencyKey } from '@/api/transport';
import {
  Card,
  ErrorMessage,
  Field,
  Loading,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import {
  deleteAccount,
  deletionPlanQuery,
  profileQuery
} from '@/features/account/api';
import { DeletionReview } from '@/features/account/components/deletion-review';

export default function DeleteAccountScreen() {
  const { t } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const router = useRouter();
  const plan = useQuery({ ...deletionPlanQuery, refetchOnMount: 'always' });
  const profile = useQuery(profileQuery);
  const [reviewed, setReviewed] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  // One key per logical attempt, so "Try again" cannot record anything twice.
  const attemptKey = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (fingerprint: string) =>
      deleteAccount(
        {
          currentPassword: password,
          confirmation: 'DELETE',
          planFingerprint: fingerprint
        },
        (attemptKey.current ??= idempotencyKey())
      ),
    onSuccess: async () => {
      queryClient.clear();
      await clearTokens();
      router.replace('/sign-in');
      dialog(t('accountDeleted'), t('accountDeletedBody'), undefined, {
        tone: 'success'
      });
    },
    onError: (error, fingerprint) => {
      if (!(error instanceof ApiError) || !error.status) {
        // No response: the request may or may not have landed, so retry with the same key.
        dialog(
          t('couldntDeleteAccount'),
          t('common:requestFailed'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            {
              text: t('common:tryAgain'),
              onPress: () => mutation.mutate(fingerprint)
            }
          ],
          { tone: 'error' }
        );
        return;
      }
      attemptKey.current = null;
      if (error.code === 'DELETION_PLAN_CHANGED') {
        dialog(
          t('balancesChanged'),
          t('balancesChangedBody'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            {
              text: t('reviewAgain'),
              onPress: () => {
                setReviewed(false);
                void plan.refetch();
              }
            }
          ],
          { tone: 'warning' }
        );
      } else if (error.status !== 403) {
        dialog(
          t('couldntDeleteAccount'),
          t('couldntDeleteAccountBody', { reason: error.message }),
          undefined,
          { tone: 'error' }
        );
      }
    }
  });

  if (plan.isLoading || profile.isLoading) return <Loading />;
  if (plan.error || profile.error || !plan.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={plan.error ?? profile.error}
          fallback={t('couldntCheckDeletion')}
        />
        <Button
          variant="outline"
          onPress={() => {
            void plan.refetch();
            void profile.refetch();
          }}
        >
          <Text>{t('common:tryAgain')}</Text>
        </Button>
      </Screen>
    );

  const current = plan.data;
  const blocked = current.settlements.length > 0 || current.groups.length > 0;

  if (blocked && !reviewed)
    return (
      <Screen
        footer={
          <View className="gap-2">
            <Button onPress={() => setReviewed(true)}>
              <Text>
                {current.settlements.length
                  ? t('settleAllAndContinue')
                  : t('leaveGroupsAndContinue')}
              </Text>
            </Button>
            <Button variant="ghost" onPress={() => router.back()}>
              <Text>{t('illDoItMyself')}</Text>
            </Button>
          </View>
        }
      >
        <DeletionReview
          plan={current}
          viewerId={profile.data.id}
          displayCurrency={profile.data.displayCurrency}
        />
      </Screen>
    );

  const pending = mutation.isPending;
  const valid = password.length > 0 && confirmation === 'DELETE';
  const wrongPassword =
    mutation.error instanceof ApiError && mutation.error.status === 403
      ? mutation.error.message
      : undefined;
  const confirmDeletion = () => {
    attemptKey.current = null;
    dialog(
      t('deleteTallyStickAccount'),
      blocked
        ? t('deletionConfirmWithPlan')
        : t('thisIsPermanentYourProfileIsAnonymizedAndEvery'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('deleteAccount'),
          style: 'destructive',
          onPress: () => mutation.mutate(current.fingerprint)
        }
      ]
    );
  };

  return (
    <Screen
      footer={
        <View className="gap-2">
          <Button
            variant="destructive"
            disabled={!valid || pending}
            accessibilityState={{ disabled: !valid || pending, busy: pending }}
            onPress={confirmDeletion}
          >
            {pending ? (
              <ActivityIndicator className="text-destructive-foreground" />
            ) : null}
            <Text>
              {pending ? t('deletingAccount') : t('permanentlyDeleteAccount')}
            </Text>
          </Button>
          {pending && blocked ? (
            <Text
              selectable
              className="text-center text-[13px] leading-[18px] text-muted-foreground"
            >
              {t('recordingAndDeleting')}
            </Text>
          ) : null}
        </View>
      }
    >
      {blocked ? null : (
        <Card>
          <Row title={t('nothingToSettle')} />
        </Card>
      )}
      <View>
        <SectionLabel>{t('whenYouDelete')}</SectionLabel>
        <Card>
          {blocked && current.settlements.length ? (
            <Row title={t('summaryRecordSettlements')} />
          ) : null}
          {blocked && current.groups.length ? (
            <Row title={t('summaryLeaveGroups')} />
          ) : null}
          <Row title={t('everyDeviceWillBeSignedOut')} />
          <Row title={t('summaryAnonymize')} />
        </Card>
      </View>
      <Field
        label={t('currentPassword')}
        secureTextEntry
        autoComplete="current-password"
        editable={!pending}
        value={password}
        onChangeText={setPassword}
        error={wrongPassword}
      />
      <Field
        label={t('typeDeleteToConfirm')}
        autoCapitalize="characters"
        editable={!pending}
        value={confirmation}
        onChangeText={setConfirmation}
        error={
          confirmation.length > 0 && confirmation !== 'DELETE'
            ? t('typeDeleteExactly')
            : undefined
        }
      />
    </Screen>
  );
}
