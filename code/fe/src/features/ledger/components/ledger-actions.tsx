import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { LedgerDraft } from '@/features/ledger/draft';
import { useLedgerDraft } from '@/features/ledger/draft';

export function LedgerActions({ draft }: { draft: LedgerDraft }) {
  const { startDraft } = useLedgerDraft();
  const open = (route: '/shared-expense' | '/settlement' | '/reminder') => {
    startDraft(draft);
    router.push(route);
  };

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <View className="flex-1"><Button onPress={() => open('/shared-expense')}><Text>Add expense</Text></Button></View>
        <View className="flex-1"><Button variant="outline" onPress={() => open('/settlement')}><Text>Record payment</Text></Button></View>
      </View>
      <Button variant="outline" onPress={() => open('/reminder')}><Text>Send reminder</Text></Button>
    </View>
  );
}
