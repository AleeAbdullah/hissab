import type { DatabaseTransaction } from '../database/database.service';
import { activityEvents } from '../database/schema';
import type { OutboxService } from '../modules/outbox/outbox.service';

export type DomainAggregate =
  'EXPENSE' | 'SETTLEMENT' | 'GROUP' | 'CONNECTION_REQUEST';

const ACTIVITY_PREFIX: Record<DomainAggregate, string> = {
  EXPENSE: 'EXPENSE',
  SETTLEMENT: 'SETTLEMENT',
  GROUP: 'GROUP',
  CONNECTION_REQUEST: 'CONNECTION',
};

export interface DomainChange {
  actorUserId: string;
  aggregate: DomainAggregate;
  aggregateId: string;
  eventType: string;
  ledgerId?: string;
  payload?: Record<string, unknown>;
}

// Every shared-ledger mutation is recorded twice in one transaction: once as
// an immutable Activity event, once as an outbox event for delivery.
export async function recordDomainChange(
  transaction: DatabaseTransaction,
  outbox: OutboxService,
  change: DomainChange,
): Promise<void> {
  const payload = change.payload ?? {};
  await transaction.insert(activityEvents).values({
    actorUserId: change.actorUserId,
    ledgerId: change.ledgerId,
    eventType: `${ACTIVITY_PREFIX[change.aggregate]}_${change.eventType}`,
    aggregateType: change.aggregate,
    aggregateId: change.aggregateId,
    payload,
  });
  await outbox.enqueue(transaction, {
    eventType: `${ACTIVITY_PREFIX[change.aggregate].toLowerCase()}.${change.eventType.toLowerCase()}`,
    aggregateType: change.aggregate.toLowerCase(),
    aggregateId: change.aggregateId,
    payload: {
      actorUserId: change.actorUserId,
      ...(change.ledgerId ? { ledgerId: change.ledgerId } : {}),
      ...payload,
    },
  });
}
