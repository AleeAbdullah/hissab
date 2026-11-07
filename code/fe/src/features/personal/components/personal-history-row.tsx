import type { Href } from 'expo-router';

import type { DisplayCurrency, PersonalHistoryItem } from '@/api/contracts';
import { Row } from '@/components/ui';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export function PersonalHistoryRow({
  displayCurrency,
  item
}: {
  displayCurrency: DisplayCurrency;
  item: PersonalHistoryItem;
}) {
  const date = formatDate(item.occurredAt);
  const shared = item.kind === 'SHARED';
  const subtitle = shared
    ? `${date} · ${item.category.name} · ${item.ledgerName ?? 'Shared ledger'} · Your share of ${formatMinorAmount(item.totalMinor ?? '0', displayCurrency)}`
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
