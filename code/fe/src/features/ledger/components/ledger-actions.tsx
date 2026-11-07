import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import type { LedgerDraft } from '@/features/ledger/draft';
import { useLedgerDraft } from '@/features/ledger/draft';

export function LedgerActions({ draft }: { draft: LedgerDraft }) {
  const dialog = useDialog();
  const { startDraft } = useLedgerDraft();
  const open = (route: '/shared-expense' | '/settlement') => {
    startDraft({ ...draft, settlement: undefined });
    router.push(route);
  };
  return (
    <Button
      onPress={() =>
        dialog(
          `Add to ${draft.ledgerName}`,
          draft.members.length < 2
            ? 'Shared records need at least two active members. Invited people can take part after they accept.'
            : 'Shared expense splits a cost between members. External payment records money already paid outside Tally Stick.',
          [
            ...(draft.members.length >= 2
              ? [
                  {
                    text: 'Shared expense',
                    style: 'choice' as const,
                    onPress: () => open('/shared-expense')
                  },
                  {
                    text: 'External payment',
                    style: 'choice' as const,
                    onPress: () => open('/settlement')
                  }
                ]
              : []),
            { text: 'Cancel', style: 'cancel' }
          ]
        )
      }
    >
      <Text>Add record</Text>
    </Button>
  );
}
