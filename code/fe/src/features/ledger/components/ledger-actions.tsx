import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui';
import type { LedgerDraft } from '@/features/ledger/draft';
import { useLedgerDraft } from '@/features/ledger/draft';

export function LedgerActions({ draft }: { draft: LedgerDraft }) {
  const { startDraft } = useLedgerDraft();
  const open = (route: '/shared-expense' | '/settlement' | '/reminder') => {
    startDraft(draft);
    router.push(route);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="Add expense" onPress={() => open('/shared-expense')} /></View>
        <View style={{ flex: 1 }}><Button title="Record payment" secondary onPress={() => open('/settlement')} /></View>
      </View>
      <Button title="Send reminder" secondary onPress={() => open('/reminder')} />
    </View>
  );
}
