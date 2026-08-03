import type { ClaimedOutboxEvent, OutboxHandler } from '../modules/outbox';
import { OutboxHandlerRegistry, OutboxService } from '../modules/outbox';
import { OutboxPollingService } from './outbox-polling.service';
import type { OutboxWorkerOptions } from './outbox-worker.options';

const EVENT_ID = '10000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-07-31T12:00:00.000Z');

function event(overrides: Partial<ClaimedOutboxEvent> = {}) {
  return {
    id: EVENT_ID,
    eventType: 'expense.created',
    aggregateType: 'expense',
    aggregateId: '20000000-0000-4000-8000-000000000002',
    payload: {},
    availableAt: NOW,
    attemptCount: 1,
    maxAttempts: 3,
    claimToken: '30000000-0000-4000-8000-000000000003',
    claimedBy: 'worker-test',
    leaseExpiresAt: new Date('2026-07-31T12:05:00.000Z'),
    processedAt: null,
    deadLetteredAt: null,
    lastError: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } satisfies ClaimedOutboxEvent;
}

describe('OutboxPollingService', () => {
  const options: OutboxWorkerOptions = {
    enabled: true,
    workerId: 'worker-test',
    pollIntervalMs: 1_000,
    batchSize: 10,
    leaseDurationMs: 300_000,
    handlerTimeoutMs: 30_000,
    initialRetryDelayMs: 5_000,
    maxRetryDelayMs: 900_000,
    retryJitterRatio: 0.2,
  };
  const claim = jest.fn();
  const acknowledge = jest.fn();
  const recordFailure = jest.fn();
  const outbox = {
    claim,
    acknowledge,
    recordFailure,
  } as unknown as OutboxService;
  let registry: OutboxHandlerRegistry;
  let service: OutboxPollingService;

  beforeEach(() => {
    jest.clearAllMocks();
    registry = new OutboxHandlerRegistry();
    service = new OutboxPollingService(outbox, registry, options);
  });

  it('acknowledges an event only after its handler succeeds', async () => {
    const handle = jest.fn().mockResolvedValue(undefined);
    const handler: OutboxHandler = {
      eventTypes: ['expense.created'],
      handle,
    };
    registry.register(handler);
    claim.mockResolvedValue([event()]);
    acknowledge.mockResolvedValue(true);

    await expect(service.pollOnce()).resolves.toBe(1);

    expect(handle).toHaveBeenCalledWith(event(), expect.any(AbortSignal));
    expect(acknowledge).toHaveBeenCalledWith(event());
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it('records a retry when no handler is registered', async () => {
    claim.mockResolvedValue([event()]);
    recordFailure.mockResolvedValue({
      disposition: 'retry',
      retryDelayMs: 5_000,
      updated: true,
    });

    await expect(service.pollOnce()).resolves.toBe(1);

    expect(acknowledge).not.toHaveBeenCalled();
    expect(recordFailure).toHaveBeenCalledWith(
      event(),
      expect.objectContaining({
        message:
          'No outbox handler is registered for event type "expense.created".',
      }),
      {
        initialDelayMs: 5_000,
        maxDelayMs: 900_000,
        jitterRatio: 0.2,
      },
    );
  });

  it('does not start an overlapping scheduled poll', async () => {
    jest.useFakeTimers();
    let resolveClaim: ((events: ClaimedOutboxEvent[]) => void) | undefined;
    claim.mockReturnValue(
      new Promise<ClaimedOutboxEvent[]>((resolve) => {
        resolveClaim = resolve;
      }),
    );

    service.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(10_000);

    expect(claim).toHaveBeenCalledTimes(1);

    resolveClaim?.([]);
    await Promise.resolve();
    await service.beforeApplicationShutdown();
    jest.useRealTimers();
  });
});
