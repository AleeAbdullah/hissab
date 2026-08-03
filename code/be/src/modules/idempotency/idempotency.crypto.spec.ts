import type { ConfigService } from '@nestjs/config';

import { IdempotencyCrypto } from './idempotency.crypto';

describe('IdempotencyCrypto', () => {
  const config = {
    get: jest.fn().mockReturnValue('test-key'),
    getOrThrow: jest.fn((key: string) =>
      key === 'IDEMPOTENCY_HMAC_KEY'
        ? 'h'.repeat(32)
        : 'e'.repeat(32),
    ),
  } as unknown as ConfigService;

  it('produces stable fingerprints independent of object key order', () => {
    const crypto = new IdempotencyCrypto(config);

    expect(
      crypto.requestFingerprint('route', { email: 'a@b.com', nested: { b: 2, a: 1 } }),
    ).toBe(
      crypto.requestFingerprint('route', { nested: { a: 1, b: 2 }, email: 'a@b.com' }),
    );
  });

  it('round-trips and authenticates encrypted responses', () => {
    const crypto = new IdempotencyCrypto(config);
    const encrypted = crypto.encrypt({ refreshToken: 'secret' });

    expect(encrypted).not.toEqual(
      expect.objectContaining({ refreshToken: 'secret' }),
    );
    expect(crypto.decrypt(encrypted)).toEqual({ refreshToken: 'secret' });

    expect(() =>
      crypto.decrypt({ ...encrypted, ciphertext: `${encrypted.ciphertext}x` }),
    ).toThrow();
  });
});

