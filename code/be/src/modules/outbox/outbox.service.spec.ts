import type { DatabaseService } from '../../database/database.service';
import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment';
import { OutboxService } from './outbox.service';
import type {
  ClaimedOutboxEvent,
  OutboxEvent,
  OutboxTransaction,
} from './outbox.types';

const EVENT_ID = '10000000-0000-4000-8000-000000000001';
const AGGREGATE_ID = '20000000-0000-4000-8000-000000000002';
const CLAIM_TOKEN = '30000000-0000-4000-8000-000000000003';
const NOW = new Date('2026-07-31T12:00:00.000Z');

function claimedEvent(overrides: Partial<ClaimedOutboxEvent> = {}) {
  return {
    id: EVENT_ID,
    eventType: 'expense.created',
    aggregateType: 'expense',
    aggregateId: AGGREGATE_ID,
    payload: { expenseId: AGGREGATE_ID },
    availableAt: NOW,
    attemptCount: 1,
    maxAttempts: 3,
    claimToken: CLAIM_TOKEN,
    claimedBy: 'worker-1',
    leaseExpiresAt: new Date('2026-07-31T12:05:00.000Z'),
    processedAt: null,
    deadLetteredAt: null,
    lastError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } satisfies ClaimedOutboxEvent;
}

describe('OutboxService', () => {
  const poolQuery = jest.fn();
  const clientQuery = jest.fn();
  const release = jest.fn();
  const connect = jest.fn().mockResolvedValue({
    query: clientQuery,
    release,
  });
  const database = {
    pool: {
      connect,
      query: poolQuery,
    },
  } as unknown as DatabaseService;
  const config = {
    getOrThrow: jest.fn().mockReturnValue(10),
  } as unknown as ConfigService<EnvironmentVariables, true>;
  const service = new OutboxService(database, config);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts an event through the caller transaction', async () => {
    const inserted: OutboxEvent = {
      ...claimedEvent(),
      claimToken: null,
      claimedBy: null,
      leaseExpiresAt: null,
      attemptCount: 0,
    };
    const returning = jest.fn().mockResolvedValue([inserted]);
    const values = jest.fn().mockReturnValue({ returning });
    const insert = jest.fn().mockReturnValue({ values });
    const transaction = { insert } as unknown as OutboxTransaction;

    await expect(
      service.enqueue(transaction, {
        eventType: 'expense.created',
        aggregateType: 'expense',
        aggregateId: AGGREGATE_ID,
        payload: { expenseId: AGGREGATE_ID },
      }),
    ).resolves.toEqual(inserted);

    expect(values).toHaveBeenCalledWith({
      eventType: 'expense.created',
      aggregateType: 'expense',
      aggregateId: AGGREGATE_ID,
      payload: { expenseId: AGGREGATE_ID },
      maxAttempts: 10,
    });
  });

  it('claims due rows in a short SKIP LOCKED transaction', async () => {
    clientQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: EVENT_ID,
            event_type: 'expense.created',
            aggregate_type: 'expense',
            aggregate_id: AGGREGATE_ID,
            payload: { expenseId: AGGREGATE_ID },
            available_at: NOW,
            attempt_count: 1,
            max_attempts: 3,
            claim_token: CLAIM_TOKEN,
            claimed_by: 'worker-1',
            lease_expires_at: new Date('2026-07-31T12:05:00.000Z'),
            processed_at: null,
            dead_lettered_at: null,
            last_error: null,
            created_at: NOW,
            updated_at: NOW,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const events = await service.claim('worker-1', 10, 300_000);

    expect(clientQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(clientQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
      expect.arrayContaining([10, 'worker-1', 300_000]),
    );
    expect(clientQuery).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
    expect(events).toEqual([claimedEvent()]);
  });

  it('fences acknowledgements with the claim token', async () => {
    poolQuery.mockResolvedValue({ rowCount: 1, rows: [{ id: EVENT_ID }] });

    await expect(service.acknowledge(claimedEvent())).resolves.toBe(true);

    expect(poolQuery).toHaveBeenCalledWith(
      expect.stringContaining('claim_token = $2::uuid'),
      [EVENT_ID, CLAIM_TOKEN],
    );
  });

  it('schedules retry with backoff before the maximum attempt', async () => {
    poolQuery.mockResolvedValue({ rowCount: 1, rows: [{ id: EVENT_ID }] });

    await expect(
      service.recordFailure(
        claimedEvent({ attemptCount: 2, maxAttempts: 3 }),
        new Error('temporary'),
        {
          initialDelayMs: 1_000,
          maxDelayMs: 10_000,
          jitterRatio: 0,
        },
        0.5,
      ),
    ).resolves.toEqual({
      disposition: 'retry',
      retryDelayMs: 2_000,
      updated: true,
    });
    expect(poolQuery).toHaveBeenCalledWith(expect.any(String), [
      EVENT_ID,
      CLAIM_TOKEN,
      2_000,
      'temporary',
    ]);
  });

  it('dead-letters the row when its durable maximum is reached', async () => {
    poolQuery.mockResolvedValue({ rowCount: 1, rows: [{ id: EVENT_ID }] });

    await expect(
      service.recordFailure(
        claimedEvent({ attemptCount: 3, maxAttempts: 3 }),
        new Error('permanent'),
        {
          initialDelayMs: 1_000,
          maxDelayMs: 10_000,
          jitterRatio: 0,
        },
      ),
    ).resolves.toEqual({
      disposition: 'dead-letter',
      updated: true,
    });
    expect(poolQuery).toHaveBeenCalledWith(expect.any(String), [
      EVENT_ID,
      CLAIM_TOKEN,
      'permanent',
    ]);
  });
});
