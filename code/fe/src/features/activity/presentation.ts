import type {
  ActivityExpenseDetails,
  ActivityGroupDetails,
  ActivityItem,
  ActivitySettlementDetails,
  ActivityUser,
  DisplayCurrency
} from '@/api/contracts';
import { formatDate } from '@/lib/dates';
import { absMinor, formatMinorAmount } from '@/lib/money';

const recordVerbs: Record<string, string> = {
  CREATED: 'added',
  REPLACED: 'edited',
  DELETED: 'deleted'
};

// One Activity row: a short title, one detail line and an optional amount.
export function activityRow(
  item: ActivityItem,
  displayCurrency: DisplayCurrency,
  currentUserId: string
) {
  const name = (user?: ActivityUser | null) =>
    !user
      ? 'Someone'
      : user.userId === currentUserId
        ? 'You'
        : user.displayName;
  const object = (user?: ActivityUser | null) =>
    user?.userId === currentUserId ? 'you' : name(user);
  const actor = name(item.actor);
  const deleted = item.eventType.endsWith('_DELETED');
  const verb = recordVerbs[item.eventType.split('_').at(-1) ?? ''] ?? 'updated';
  const ledger = item.ledger?.name;

  if (item.area === 'EXPENSE' || item.area === 'SETTLEMENT') {
    const expense =
      item.area === 'EXPENSE' ? (item.details as ActivityExpenseDetails) : null;
    const payment =
      item.area === 'SETTLEMENT'
        ? (item.details as ActivitySettlementDetails)
        : null;
    const occurredAt = (expense ?? payment)?.occurredAt;
    // Compare against the same day label the list heading uses, so "dated" only shows when it differs.
    const dated =
      occurredAt &&
      activityDayLabel(occurredAt) !== activityDayLabel(item.createdAt)
        ? `dated ${formatDate(occurredAt, occurredAt.slice(0, 4) !== item.createdAt.slice(0, 4))}`
        : undefined;
    const net = expense ? BigInt(expense.viewerNetMinor) : 0n;
    const effect =
      !expense || deleted
        ? undefined
        : net > 0n
          ? `you lent ${formatMinorAmount(absMinor(net), displayCurrency)}`
          : net < 0n
            ? `you borrowed ${formatMinorAmount(absMinor(net), displayCurrency)}`
            : undefined;
    return {
      title: expense
        ? expense.description
        : `${name(payment?.from)} paid ${object(payment?.to)}`,
      subtitle: [`${actor} ${verb}`, ledger, dated].filter(Boolean).join(' · '),
      amount: formatMinorAmount(
        expense ? expense.totalMinor : (payment?.amountMinor ?? '0'),
        displayCurrency
      ),
      categoryCode: expense?.category.code,
      effect,
      lent: net > 0n,
      deleted
    };
  }

  if (item.area === 'GROUP') {
    const details = item.details as ActivityGroupDetails;
    const group = details.name ?? ledger ?? 'a group';
    const subject = object(details.subjectUser);
    const titles: Record<string, string> = {
      GROUP_CREATED: `${actor} created ${group}`,
      GROUP_UPDATED: `${actor} renamed the group to ${group}`,
      GROUP_INVITATION_SENT: `${actor} invited ${subject} to ${group}`,
      GROUP_INVITATION_CANCELLED: `${actor} cancelled ${subject === 'you' ? 'your' : `${subject}’s`} invitation to ${group}`,
      GROUP_INVITATION_ACCEPTED: `${actor} joined ${group}`,
      GROUP_INVITATION_DECLINED: `${actor} declined the invitation to ${group}`,
      GROUP_MEMBER_LEFT: `${actor} left ${group}`,
      GROUP_ARCHIVED:
        details.reason === 'LAST_MEMBER_LEFT' || !item.actor
          ? `${group} was archived`
          : `${actor} archived ${group}`
    };
    return { title: titles[item.eventType] ?? `${actor} updated ${group}` };
  }

  const other = object(item.counterparty);
  const own = item.actor?.userId === currentUserId;
  const theirs = own ? `${other}’s` : 'your';
  const titles: Record<string, string> = {
    CONNECTION_CREATED: `${actor} sent ${other} a friend request`,
    CONNECTION_ACCEPTED: `${actor} accepted ${theirs} friend request`,
    CONNECTION_DECLINED: `${actor} declined ${theirs} friend request`,
    CONNECTION_CANCELLED: own
      ? `You cancelled your friend request to ${other}`
      : `${actor} cancelled their friend request`,
    CONNECTION_USER_BLOCKED: `${actor} blocked ${other}`,
    CONNECTION_USER_UNBLOCKED: `${actor} unblocked ${other}`
  };
  return { title: titles[item.eventType] ?? `${actor} updated a friendship` };
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

// Groups items newest first under one heading per UTC day.
export function groupByDay<T extends { occurredAt: string }>(items: T[]) {
  const days: { title: string; items: T[] }[] = [];
  for (const item of [...items].sort((left, right) =>
    right.occurredAt.localeCompare(left.occurredAt)
  )) {
    const title = activityDayLabel(item.occurredAt);
    const last = days.at(-1);
    if (last?.title === title) last.items.push(item);
    else days.push({ title, items: [item] });
  }
  return days;
}

function sameDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

// An invitation that was later accepted reads as one "joined" row, not two.
export function collapseInvitations(items: ActivityItem[]) {
  const pending = new Map<string, string>();
  const hidden = new Set<string>();
  for (const item of [...items].reverse()) {
    const subject =
      item.eventType === 'GROUP_INVITATION_SENT' ||
      item.eventType === 'GROUP_INVITATION_CANCELLED'
        ? (item.details as ActivityGroupDetails).subjectUser?.userId
        : item.actor?.userId;
    if (!item.ledger || !subject) continue;
    const key = `${item.ledger.id}:${subject}`;
    if (item.eventType === 'GROUP_INVITATION_SENT') pending.set(key, item.id);
    else if (item.eventType === 'GROUP_INVITATION_ACCEPTED') {
      const sent = pending.get(key);
      if (sent) hidden.add(sent);
      pending.delete(key);
    } else if (
      item.eventType === 'GROUP_INVITATION_DECLINED' ||
      item.eventType === 'GROUP_INVITATION_CANCELLED'
    )
      pending.delete(key);
  }
  return hidden.size ? items.filter((item) => !hidden.has(item.id)) : items;
}
