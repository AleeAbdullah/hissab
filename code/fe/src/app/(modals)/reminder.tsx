import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ApiError } from '@/api/transport';
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
import { Text as ButtonText } from '@/components/ui/text';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { formatMinorAmount } from '@/features/balances/format';
import { useLedgerDraft } from '@/features/ledger/draft';
import { createReminder } from '@/features/reminders/api';

function owedAmount(
  amountMinor: string,
  displayCurrency: Parameters<typeof formatMinorAmount>[1]
) {
  return formatMinorAmount((-BigInt(amountMinor)).toString(), displayCurrency);
}

export default function ReminderScreen() {
  const { clearDraft, draft } = useLedgerDraft();
  const balances = useQuery({
    ...ledgerBalancesQuery(draft?.ledgerId ?? ''),
    enabled: Boolean(draft)
  });
  const [recipientUserId, setRecipientUserId] = useState<string>();
  const mutation = useMutation({
    mutationFn: (recipient: string) =>
      createReminder(draft!.ledgerId, recipient),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', draft!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: ['balances'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] })
      ]);
      Alert.alert(
        'Reminder sent',
        'Hissab will notify this member about their unsettled balance.',
        [
          {
            text: 'Done',
            onPress: () => {
              clearDraft();
              router.back();
            }
          }
        ]
      );
    }
  });

  if (!draft)
    return (
      <Screen>
        <Notice title="Choose a ledger first">
          Open a friend or group ledger before sending a balance reminder.
        </Notice>
      </Screen>
    );
  if (balances.isLoading) return <Loading />;
  if (balances.error || !balances.data)
    return (
      <Screen>
        <ErrorMessage
          error={balances.error ?? new Error('Could not load ledger balances.')}
        />
      </Screen>
    );

  const ownBalance = BigInt(
    balances.data.members.find(
      (member) => member.userId === draft.currentUserId
    )?.netMinor ?? '0'
  );
  const recipients = draft.members.filter((member) => {
    const balance =
      balances.data!.members.find((item) => item.userId === member.userId)
        ?.netMinor ?? '0';
    return member.userId !== draft.currentUserId && BigInt(balance) < 0n;
  });
  const cooldown =
    mutation.error instanceof ApiError &&
    mutation.error.status === 429 &&
    typeof mutation.error.details?.retryAt === 'string'
      ? `You can send another reminder after ${new Date(mutation.error.details.retryAt).toLocaleString()}.`
      : undefined;
  const recipient = recipients.find(
    (member) => member.userId === recipientUserId
  );
  const send = () => {
    if (!recipient) return;
    Alert.alert(
      'Send balance reminder?',
      `${recipient.displayName} will receive a private notification about this ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send reminder',
          onPress: () => mutation.mutate(recipient.userId)
        }
      ]
    );
  };

  return (
    <Screen>
      <Notice title="Only send when you are owed">
        Hissab confirms that you are owed and the recipient owes in this active
        ledger before sending a reminder.
      </Notice>
      {ownBalance <= 0n ? (
        <Notice title="No reminder available">
          You are not currently owed a balance in this ledger.
        </Notice>
      ) : null}
      {cooldown ? (
        <Notice title="Reminder cooldown">{cooldown}</Notice>
      ) : mutation.error ? (
        <ErrorMessage error={mutation.error} />
      ) : null}
      {recipients.length ? (
        <>
          <SectionLabel>MEMBERS WHO OWE</SectionLabel>
          <Card>
            {recipients.map((member) => {
              const amount =
                balances.data!.members.find(
                  (item) => item.userId === member.userId
                )?.netMinor ?? '0';
              return (
                <Row
                  key={member.userId}
                  title={member.displayName}
                  detail={
                    member.userId === recipientUserId
                      ? 'Selected'
                      : `Owes ${owedAmount(amount, draft.displayCurrency)}`
                  }
                  disabled={mutation.isPending}
                  onPress={() => setRecipientUserId(member.userId)}
                />
              );
            })}
          </Card>
        </>
      ) : (
        <Notice title="No one to remind">
          No active member currently owes a balance in this ledger.
        </Notice>
      )}
      <Button
        disabled={mutation.isPending || ownBalance <= 0n || !recipient}
        accessibilityState={{
          disabled: mutation.isPending || ownBalance <= 0n || !recipient,
          busy: mutation.isPending
        }}
        onPress={send}
      >
        {mutation.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText>Send reminder</ButtonText>
        )}
      </Button>
    </Screen>
  );
}
