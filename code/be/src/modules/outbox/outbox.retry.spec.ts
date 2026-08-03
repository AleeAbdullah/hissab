import { calculateRetryDelayMs, serializeOutboxError } from './outbox.retry';

describe('outbox retry helpers', () => {
  const options = {
    initialDelayMs: 1_000,
    maxDelayMs: 10_000,
    jitterRatio: 0.2,
  };

  it('uses bounded exponential backoff with deterministic jitter', () => {
    expect(calculateRetryDelayMs(1, options, 0.5)).toBe(1_000);
    expect(calculateRetryDelayMs(3, options, 0.5)).toBe(4_000);
    expect(calculateRetryDelayMs(20, options, 1)).toBe(10_000);
  });

  it('stores a bounded error message without a stack trace', () => {
    const error = new Error(`failed:${'x'.repeat(5_000)}`);
    error.stack = 'sensitive stack';

    const serialized = serializeOutboxError(error);

    expect(serialized).toHaveLength(4_000);
    expect(serialized).toContain('failed:');
    expect(serialized).not.toContain('sensitive stack');
  });
});
