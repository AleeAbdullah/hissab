import { BadRequestException } from '@nestjs/common';

import { parseIdempotencyKey } from './idempotency-key.decorator';

describe('parseIdempotencyKey', () => {
  it('accepts a sufficiently long URL-safe key', () => {
    expect(parseIdempotencyKey('018fc2de-1234-4567-89ab-0123456789ab')).toBe(
      '018fc2de-1234-4567-89ab-0123456789ab',
    );
  });

  it.each([undefined, '', 'too-short', ['one', 'two'], 'contains spaces here'])(
    'rejects invalid input %p',
    (value) => {
      expect(() => parseIdempotencyKey(value)).toThrow(BadRequestException);
    },
  );
});
