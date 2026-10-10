import { useDialog } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { DisplayCurrency, LedgerBalances } from '@/api/contracts';
import { Card, ErrorMessage, Notice, Row } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { createReminder } from '@/features/reminders/api';

import { memberBalanceDescription } from '@/features/balances/format';

export function LedgerBalanceCards({
  balances,
  canRemind = true,
  currentUserId,
  displayCurrency,
  ledgerName
}: {
  balances: LedgerBalances;
  canRemind?: boolean;
  currentUserId: string;
  displayCurrency: DisplayCurrency;
  ledgerName: string;
}) {
  const dialog = useDialog();
  const ledgerId = balances.ledgerId;
  const [now, setNow] = useState(() => Date.now());
  const ownBalance = BigInt(
    balances.members.find((member) => member.userId === currentUserId)
      ?.netMinor ?? '0'
  );
  const mutation = useMutation({
    mutationFn: ({ userId }: { userId: string; displayName: string }) =>
      createReminder(ledgerId, userId),
    onSuccess: async (_, recipient) => {
      await queryClient.invalidateQueries({
        queryKey: ['ledgers', ledgerId, 'balances']
      });
      dialog(
        'Reminder sent',
        `Hissab notified ${recipient.displayName} about the unsettled balance.`,
        [{ text: 'Done' }],
        { tone: 'success' }
      );
    },
    onError: () =>
      queryClient.invalidateQueries({
        queryKey: ['ledgers', ledgerId, 'balances']
      })
  });
  const nextCooldownEnd = Math.min(
    ...balances.members
      .map((member) =>
        member.reminderAvailableAt
          ? new Date(member.reminderAvailableAt).getTime()
          : Number.POSITIVE_INFINITY
      )
      .filter((value) => value > now)
  );
  useEffect(() => {
    if (!Number.isFinite(nextCooldownEnd)) return;
    const timeout = setTimeout(
      () => {
        setNow(Date.now());
        void queryClient.invalidateQueries({
          queryKey: ['ledgers', ledgerId, 'balances']
        });
      },
      nextCooldownEnd - Date.now() + 50
    );
    return () => clearTimeout(timeout);
  }, [ledgerId, nextCooldownEnd]);

  if (!balances.members.length) {
    return (
      <Notice title="No recorded balance">
        No shared expenses or settlements have created balances in this ledger
        yet.
      </Notice>
    );
  }

  return (
    <>
      <Card>
        {balances.members.map((member) => {
          const reminderAvailableAt = member.reminderAvailableAt
            ? new Date(member.reminderAvailableAt).getTime()
            : 0;
          const inCooldown = reminderAvailableAt > now;
          const eligible =
            canRemind &&
            member.userId !== currentUserId &&
            ownBalance > 0n &&
            BigInt(member.netMinor) < 0n;
          return (
            <Row
              key={member.userId}
              title={member.displayName}
              detail={memberBalanceDescription(
                member.netMinor,
                displayCurrency
              )}
              trailing={
                eligible ? (
                  inCooldown ? (
                    <Text
                      selectable
                      className="max-w-[38%] text-right text-[13px] leading-[18px] text-muted-foreground"
                    >
                      Reminded today
                    </Text>
                  ) : (
                    <Button
                      variant="link"
                      size="sm"
                      disabled={mutation.isPending}
                      accessibilityLabel={`Remind ${member.displayName} about the unsettled balance in ${ledgerName}`}
                      accessibilityState={{
                        disabled: mutation.isPending,
                        busy:
                          mutation.isPending &&
                          mutation.variables?.userId === member.userId
                      }}
                      onPress={() =>
                        dialog(
                          'Send balance reminder?',
                          `${member.displayName} will receive a private notification about their unsettled balance in ${ledgerName}.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Send reminder',
                              onPress: () => mutation.mutate(member)
                            }
                          ]
                        )
                      }
                    >
                      {mutation.isPending &&
                      mutation.variables?.userId === member.userId ? (
                        <ActivityIndicator className="text-primary" />
                      ) : (
                        <Text>Remind</Text>
                      )}
                    </Button>
                  )
                ) : undefined
              }
            />
          );
        })}
      </Card>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
    </>
  );
}
