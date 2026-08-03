import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

export const OUTBOX_WORKER_OPTIONS = Symbol('OUTBOX_WORKER_OPTIONS');

export interface OutboxWorkerOptions {
  enabled: boolean;
  workerId: string;
  pollIntervalMs: number;
  batchSize: number;
  leaseDurationMs: number;
  handlerTimeoutMs: number;
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
  retryJitterRatio: number;
}

export function createDefaultOutboxWorkerOptions(
  overrides: Partial<OutboxWorkerOptions> = {},
): OutboxWorkerOptions {
  return {
    enabled: true,
    workerId: `${hostname()}:${process.pid}:${randomUUID()}`,
    pollIntervalMs: 1_000,
    batchSize: 10,
    leaseDurationMs: 5 * 60_000,
    handlerTimeoutMs: 30_000,
    initialRetryDelayMs: 5_000,
    maxRetryDelayMs: 15 * 60_000,
    retryJitterRatio: 0.2,
    ...overrides,
  };
}
