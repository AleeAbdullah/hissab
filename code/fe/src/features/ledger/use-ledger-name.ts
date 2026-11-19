import { useInfiniteQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { activityInfiniteQuery } from '@/features/activity/api';

export function useLedgerName(ledgerId: string | undefined, fallback?: string) {
  const { t } = useTranslation(['ledger', 'common']);
  const activity = useInfiniteQuery({
    ...activityInfiniteQuery({ ledgerId }),
    enabled: Boolean(ledgerId)
  });
  const name = activity.data?.pages[0]?.items.find((item) => item.ledger)
    ?.ledger?.name;
  return (
    name ?? (activity.isPending ? undefined : (fallback ?? t('sharedLedger')))
  );
}
