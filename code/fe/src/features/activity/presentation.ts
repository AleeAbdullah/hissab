import type {
  ActivityExpenseDetails,
  ActivityGroupDetails,
  ActivityItem,
  ActivitySettlementDetails,
  DisplayCurrency
} from '@/api/contracts';
import { formatDate, formatTime } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

const actions: Record<string, string> = {
  EXPENSE_CREATED: 'recorded',
  EXPENSE_REPLACED: 'edited',
  EXPENSE_DELETED: 'deleted',
  SETTLEMENT_CREATED: 'recorded',
  SETTLEMENT_REPLACED: 'edited',
  SETTLEMENT_DELETED: 'deleted',
  GROUP_CREATED: 'created a group',
  GROUP_UPDATED: 'updated a group',
  GROUP_INVITATION_SENT: 'sent a group invitation',
  GROUP_INVITATION_CANCELLED: 'cancelled a group invitation',
  GROUP_INVITATION_ACCEPTED: 'accepted a group invitation',
  GROUP_INVITATION_DECLINED: 'declined a group invitation',
  GROUP_MEMBER_LEFT: 'left a group',
  GROUP_ARCHIVED: 'archived',
  CONNECTION_CREATED: 'sent a connection request',
  CONNECTION_ACCEPTED: 'accepted a connection request',
  CONNECTION_DECLINED: 'declined a connection request',
  CONNECTION_CANCELLED: 'cancelled a connection request',
  CONNECTION_USER_BLOCKED: 'blocked a connection',
  CONNECTION_USER_UNBLOCKED: 'unblocked a connection'
};

export function describeActivity(
  item: ActivityItem,
  displayCurrency: DisplayCurrency,
  currentUserId?: string
) {
  const actor =
    item.actor?.userId === currentUserId && currentUserId
      ? 'You'
      : (item.actor?.displayName ?? 'Someone');
  const action =
    actions[item.eventType] ??
    item.eventType.replaceAll('_', ' ').toLowerCase();
  const context =
    item.ledger?.name ??
    groupName(item) ??
    item.counterparty?.displayName ??
    'Tally Stick';

  if (item.area === 'EXPENSE') {
    const details = item.details as ActivityExpenseDetails;
    return {
      actor,
      action,
      subject: details.description,
      version: details.version,
      occurredAt: details.occurredAt,
      context,
      amount: formatMinorAmount(details.totalMinor, displayCurrency)
    };
  }
  if (item.area === 'SETTLEMENT') {
    const details = item.details as ActivitySettlementDetails;
    return {
      actor,
      action,
      subject: `${details.from.displayName} paid ${details.to.displayName}`,
      version: details.version,
      occurredAt: details.occurredAt,
      context,
      amount: formatMinorAmount(details.amountMinor, displayCurrency)
    };
  }
  return {
    actor,
    action,
    subject: `${actor} ${action}`,
    context: groupContext(item, context)
  };
}

export function activityDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return formatDate(date, date.getUTCFullYear() !== today.getUTCFullYear());
}

export const activityTimeLabel = formatTime;

export function activityOccurrenceLabel(
  occurredAt: string | undefined,
  createdAt: string
) {
  if (!occurredAt || occurredAt.slice(0, 10) === createdAt.slice(0, 10))
    return '';
  return (
    ' · for ' +
    formatDate(occurredAt, occurredAt.slice(0, 4) !== createdAt.slice(0, 4))
  );
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
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}
