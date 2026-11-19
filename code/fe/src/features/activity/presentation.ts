import type {
  ActivityExpenseDetails,
  ActivityGroupDetails,
  ActivityItem,
  ActivitySettlementDetails,
  ActivityUser,
  DisplayCurrency
} from '@/api/contracts';
import { i18n, isolate } from '@/i18n';
import { formatDate } from '@/lib/dates';
import { absMinor, formatMinorAmount } from '@/lib/money';

// One Activity row: a short title, one detail line and an optional amount.
export function activityRow(
  item: ActivityItem,
  displayCurrency: DisplayCurrency,
  currentUserId: string
) {
  const name = (user?: ActivityUser | null) =>
    isolate(
      !user
        ? i18n.t('activity:someone')
        : user.userId === currentUserId
          ? i18n.t('activity:you')
          : user.displayName
    );
  const object = (user?: ActivityUser | null) =>
    user?.userId === currentUserId
      ? isolate(i18n.t('activity:youObject'))
      : name(user);
  const own = item.actor?.userId === currentUserId;
  const actor = name(item.actor);
  const deleted = item.eventType.endsWith('_DELETED');
  const ledger = item.ledger?.name;
  if (item.area === 'EXPENSE' || item.area === 'SETTLEMENT') {
    const expense =
      item.area === 'EXPENSE' ? (item.details as ActivityExpenseDetails) : null;
    const payment =
      item.area === 'SETTLEMENT'
        ? (item.details as ActivitySettlementDetails)
        : null;
    const occurredAt = (expense ?? payment)?.occurredAt;
    const dated =
      occurredAt &&
      activityDayLabel(occurredAt) !== activityDayLabel(item.createdAt)
        ? i18n.t('activity:dated', {
            date: isolate(
              formatDate(
                occurredAt,
                occurredAt.slice(0, 4) !== item.createdAt.slice(0, 4)
              )
            )
          })
        : undefined;
    const net = expense ? BigInt(expense.viewerNetMinor) : 0n;
    const effect =
      !expense || deleted || net === 0n
        ? undefined
        : i18n.t(net > 0n ? 'activity:lent' : 'activity:borrowed', {
            amount: isolate(formatMinorAmount(absMinor(net), displayCurrency))
          });
    const action = item.eventType.endsWith('_CREATED')
      ? own
        ? 'activity:recordAddedSelf'
        : 'activity:recordAdded'
      : item.eventType.endsWith('_REPLACED')
        ? own
          ? 'activity:recordEditedSelf'
          : 'activity:recordEdited'
        : deleted
          ? own
            ? 'activity:recordDeletedSelf'
            : 'activity:recordDeleted'
          : own
            ? 'activity:recordUpdatedSelf'
            : 'activity:recordUpdated';
    return {
      title: expense
        ? expense.description
        : i18n.t(
            payment?.from?.userId === currentUserId
              ? 'activity:paidByYou'
              : payment?.to?.userId === currentUserId
                ? 'activity:paidToYou'
                : 'activity:paidPerson',
            {
              from: name(payment?.from),
              to: name(payment?.to)
            }
          ),
      subtitle: [i18n.t(action, { actor }), ledger && isolate(ledger), dated]
        .filter(Boolean)
        .join(' · '),
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
    const group = isolate(details.name ?? ledger ?? i18n.t('activity:aGroup'));
    const subject = object(details.subjectUser);
    const keys = {
      GROUP_CREATED: own
        ? 'activity:groupCreatedSelf'
        : 'activity:groupCreated',
      GROUP_UPDATED: own
        ? 'activity:groupUpdatedSelf'
        : 'activity:groupUpdated',
      GROUP_INVITATION_SENT: own
        ? 'activity:groupInvitedSelf'
        : 'activity:groupInvited',
      GROUP_INVITATION_CANCELLED:
        details.subjectUser?.userId === currentUserId
          ? own
            ? 'activity:groupCancelledYoursSelf'
            : 'activity:groupCancelledYours'
          : own
            ? 'activity:groupCancelledSelf'
            : 'activity:groupCancelled',
      GROUP_INVITATION_ACCEPTED: own
        ? 'activity:groupJoinedSelf'
        : 'activity:groupJoined',
      GROUP_INVITATION_DECLINED: own
        ? 'activity:groupDeclinedSelf'
        : 'activity:groupDeclined',
      GROUP_MEMBER_LEFT: own ? 'activity:groupLeftSelf' : 'activity:groupLeft',
      GROUP_ARCHIVED:
        details.reason === 'LAST_MEMBER_LEFT' || !item.actor
          ? 'activity:groupArchivedAuto'
          : own
            ? 'activity:groupArchivedSelf'
            : 'activity:groupArchived'
    } as const;
    const key =
      keys[item.eventType as keyof typeof keys] ??
      (own ? 'activity:groupChangedSelf' : 'activity:groupChanged');
    return { title: i18n.t(key, { actor, group, subject }) };
  }
  const other = object(item.counterparty);
  const keys = {
    CONNECTION_CREATED: own
      ? 'activity:friendRequestedSelf'
      : 'activity:friendRequested',
    CONNECTION_ACCEPTED: own
      ? 'activity:friendAcceptedSelf'
      : 'activity:friendAcceptedYours',
    CONNECTION_DECLINED: own
      ? 'activity:friendDeclinedSelf'
      : 'activity:friendDeclinedYours',
    CONNECTION_CANCELLED: own
      ? 'activity:friendCancelledOwn'
      : 'activity:friendCancelled',
    CONNECTION_USER_BLOCKED: own ? 'activity:blockedSelf' : 'activity:blocked',
    CONNECTION_USER_UNBLOCKED: own
      ? 'activity:unblockedSelf'
      : 'activity:unblocked'
  } as const;
  return {
    title: i18n.t(
      keys[item.eventType as keyof typeof keys] ??
        (own ? 'activity:friendChangedSelf' : 'activity:friendChanged'),
      { actor, other }
    )
  };
}

export function activityDayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  if (sameDay(date, today)) return i18n.t('common:today');
  if (sameDay(date, yesterday)) return i18n.t('common:yesterday');
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
