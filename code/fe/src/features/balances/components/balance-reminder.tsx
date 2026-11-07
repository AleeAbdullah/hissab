import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { LedgerBalances } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { createReminder } from '@/features/reminders/api';
import { formatDateTime } from '@/lib/dates';

export function BalanceReminder({
  ledgerId,
  ledgerName,
  member
}: {
  ledgerId: string;
  ledgerName: string;
  member: LedgerBalances['members'][number];
}) {
  const dialog = useDialog();
  const [now, setNow] = useState(Date.now);
  const until = member.reminderAvailableAt
    ? new Date(member.reminderAvailableAt).getTime()
    : 0;
  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: ['ledgers', ledgerId, 'balances']
    });
  const mutation = useMutation({
    mutationFn: () => createReminder(ledgerId, member.userId),
    onSuccess: async () => {
      await refresh();
      dialog(
        'Reminder sent',
        `Tally Stick notified ${member.displayName} about the unsettled balance.`,
        [{ text: 'Done' }],
        { tone: 'success' }
      );
    },
    onError: refresh
  });
  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setTimeout(
      () => {
        setNow(Date.now());
        void queryClient.invalidateQueries({
          queryKey: ['ledgers', ledgerId, 'balances']
        });
      },
      until - Date.now() + 50
    );
    return () => clearTimeout(timer);
  }, [until, ledgerId]);
  return (
    <>
      {until > now ? (
        <Text
          selectable
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          Reminder available {formatDateTime(new Date(until))}
        </Text>
      ) : (
        <Button
          variant="outline"
          size="compact"
          disabled={mutation.isPending}
          accessibilityLabel={`Remind ${member.displayName} about ${ledgerName}`}
          accessibilityState={{
            disabled: mutation.isPending,
            busy: mutation.isPending
          }}
          onPress={() =>
            dialog(
              'Send balance reminder?',
              `${member.displayName} will receive a private notification about their unsettled balance in ${ledgerName}.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send reminder',
                  onPress: () => {
                    if (!mutation.isPending) mutation.mutate();
                  }
                }
              ]
            )
          }
        >
          <Text>{mutation.isPending ? 'Sending…' : 'Remind'}</Text>
        </Button>
      )}
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
    </>
  );
}
