import type { Href } from 'expo-router';

export function reminderLedgerHref(data: Record<string, unknown>): Href | null {
  const {
    actorUserId,
    eventType,
    ledgerId,
    ledgerType,
    aggregateType,
    aggregateId
  } = data;
  if (typeof aggregateId === 'string' && aggregateType === 'expense')
    return {
      pathname: '/expense/[expenseId]',
      params: { expenseId: aggregateId }
    };
  if (typeof aggregateId === 'string' && aggregateType === 'settlement')
    return {
      pathname: '/payment/[paymentId]',
      params: { paymentId: aggregateId }
    };
  if (eventType !== 'reminder.created' || typeof ledgerId !== 'string')
    return null;
  if (ledgerType === 'GROUP')
    return {
      pathname: '/groups/[groupId]',
      params: { groupId: ledgerId }
    };
  if (ledgerType === 'DIRECT' && typeof actorUserId === 'string')
    return {
      pathname: '/groups/friends/[friendId]',
      params: { friendId: actorUserId, ledgerId }
    };
  return null;
}
