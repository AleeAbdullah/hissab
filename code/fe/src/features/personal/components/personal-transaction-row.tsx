import type { Href } from 'expo-router';

import type { DisplayCurrency, PersonalTransaction } from '@/api/contracts';
import { Row } from '@/components/ui';
import { formatMinorAmount } from '@/features/balances/format';

export function PersonalTransactionRow({ displayCurrency, transaction }: { displayCurrency: DisplayCurrency; transaction: PersonalTransaction }) {
  const subtitle = `${new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(transaction.occurredAt))} · ${transaction.category.name}${transaction.status === 'DELETED' ? ' · Deleted' : ''}`;
  const href: Href = { pathname: '/personal/[transactionId]', params: { transactionId: transaction.id } };
  return <Row title={transaction.description} subtitle={subtitle} detail={formatMinorAmount(transaction.amountMinor, displayCurrency)} href={href} />;
}
