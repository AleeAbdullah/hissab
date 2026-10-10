import type { Href } from 'expo-router';

import type { DisplayCurrency, PersonalHistoryItem } from '@/api/contracts';
import { Row } from '@/components/ui';
import { formatMinorAmount } from '@/lib/utils';

export function PersonalHistoryRow({
  displayCurrency,
  item
}: {
  displayCurrency: DisplayCurrency;
  item: PersonalHistoryItem;
}) {
  const date = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(item.occurredAt));
  const shared = item.kind === 'SHARED';
  const subtitle = shared
    ? `${date} · ${item.category.name} · ${item.ledgerName ?? 'Shared ledger'} · Full ${formatMinorAmount(item.totalMinor ?? '0', displayCurrency)} · Your share`
    : `${date} · ${item.category.name}`;
  const href: Href = shared
    ? { pathname: '/expense/[expenseId]', params: { expenseId: item.id } }
    : {
        pathname: '/personal/[transactionId]',
        params: { transactionId: item.id }
      };
  return (
    <Row
      title={item.description}
      titleBadge={shared ? 'Shared' : undefined}
      subtitle={subtitle}
      detail={formatMinorAmount(item.amountMinor, displayCurrency)}
      href={href}
    />
  );
}
