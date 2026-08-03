import type { RetryBackoffOptions } from './outbox.types';

const MAX_ERROR_LENGTH = 4_000;

export function calculateRetryDelayMs(
  attemptCount: number,
  options: RetryBackoffOptions,
  randomValue = Math.random(),
): number {
  const exponent = Math.max(0, attemptCount - 1);
  const exponentialDelay = Math.min(
    options.maxDelayMs,
    options.initialDelayMs * 2 ** exponent,
  );
  const boundedRandom = Math.min(1, Math.max(0, randomValue));
  const jitterMultiplier =
    1 - options.jitterRatio + 2 * options.jitterRatio * boundedRandom;

  return Math.min(
    options.maxDelayMs,
    Math.max(0, Math.round(exponentialDelay * jitterMultiplier)),
  );
}

export function serializeOutboxError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, MAX_ERROR_LENGTH);
}
