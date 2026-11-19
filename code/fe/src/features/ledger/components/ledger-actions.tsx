import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { LedgerBalances } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { LedgerDraft } from '@/features/ledger/draft';
import { useLedgerDraft } from '@/features/ledger/draft';
import { settleUpDraft } from '@/features/ledger/settle';

export function LedgerActions({
  draft,
  balances,
  direct = false
}: {
  draft: LedgerDraft;
  balances?: LedgerBalances;
  direct?: boolean;
}) {
  const { t } = useTranslation(['ledger', 'common']);
  const { startDraft } = useLedgerDraft();
  const disabled = draft.members.length < 2;
  return (
    <View className="flex-row gap-3">
      <Button
        className="flex-1"
        disabled={disabled}
        onPress={() => {
          startDraft({ ...draft, settlement: undefined });
          router.push('/shared-expense');
        }}
      >
        <Text>{t('addExpense')}</Text>
      </Button>
      <Button
        variant="outline"
        className="flex-1"
        disabled={disabled || !balances}
        onPress={() => {
          if (!balances) return;
          startDraft({
            ...draft,
            settlement: settleUpDraft(balances, draft, direct)
          });
          router.push('/settlement');
        }}
      >
        <Text>{t('recordPayment')}</Text>
      </Button>
    </View>
  );
}
