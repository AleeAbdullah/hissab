import type { Href } from 'expo-router';

export function reminderLedgerHref(data: Record<string, unknown>): Href | null {
  const { actorUserId, eventType, ledgerId, ledgerType } = data;
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
      params: { friendId: actorUserId }
    };
  return null;
}
