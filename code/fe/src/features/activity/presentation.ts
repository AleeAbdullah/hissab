import type {
  ActivityExpenseDetails,
  ActivityGroupDetails,
  ActivityItem,
  ActivitySettlementDetails,
  DisplayCurrency
} from '@/api/contracts';
import { formatMinorAmount } from '@/features/balances/format';

const actions: Record<string, string> = {
  EXPENSE_CREATED: 'added an expense',
  EXPENSE_REPLACED: 'edited an expense',
  EXPENSE_DELETED: 'deleted an expense',
  SETTLEMENT_CREATED: 'recorded a payment',
  SETTLEMENT_REPLACED: 'edited a payment',
  SETTLEMENT_DELETED: 'deleted a payment',
  GROUP_CREATED: 'created a group',
  GROUP_UPDATED: 'updated a group',
  GROUP_INVITATION_SENT: 'sent a group invitation',
  GROUP_INVITATION_CANCELLED: 'cancelled a group invitation',
  GROUP_INVITATION_ACCEPTED: 'accepted a group invitation',
  GROUP_INVITATION_DECLINED: 'declined a group invitation',
  GROUP_MEMBER_LEFT: 'left a group',
  GROUP_ARCHIVED: 'archived a group',
  CONNECTION_CREATED: 'sent a connection request',
  CONNECTION_ACCEPTED: 'accepted a connection request',
  CONNECTION_DECLINED: 'declined a connection request',
  CONNECTION_CANCELLED: 'cancelled a connection request',
  CONNECTION_USER_BLOCKED: 'blocked a connection',
  CONNECTION_USER_UNBLOCKED: 'unblocked a connection'
};

export function describeActivity(
  item: ActivityItem,
  displayCurrency: DisplayCurrency
) {
  const actor = item.actor?.displayName ?? 'Hissab';
  const action =
    actions[item.eventType] ??
    item.eventType.replaceAll('_', ' ').toLowerCase();
  const context =
    item.ledger?.name ??
    groupName(item) ??
    item.counterparty?.displayName ??
    'Hissab';

  if (item.area === 'EXPENSE') {
    const details = item.details as ActivityExpenseDetails;
    return {
      actor,
      action,
      context: `${context} · ${details.description}`,
      amount: formatMinorAmount(details.totalMinor, displayCurrency)
    };
  }
  if (item.area === 'SETTLEMENT') {
    const details = item.details as ActivitySettlementDetails;
    return {
      actor,
      action,
      context: `${context} · ${details.from.displayName} paid ${details.to.displayName}`,
      amount: formatMinorAmount(details.amountMinor, displayCurrency)
    };
  }
  return { actor, action, context: groupContext(item, context) };
}

export function activityDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric'
  }).format(date);
}

export function activityTimeLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function groupName(item: ActivityItem) {
  return item.area === 'GROUP'
    ? (item.details as ActivityGroupDetails).name
    : undefined;
}

function groupContext(item: ActivityItem, fallback: string) {
  if (item.area !== 'GROUP') return fallback;
  const details = item.details as ActivityGroupDetails;
  return details.subjectUser
    ? `${fallback} · ${details.subjectUser.displayName}`
    : fallback;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
