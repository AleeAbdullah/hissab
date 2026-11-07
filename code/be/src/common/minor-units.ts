import { BadRequestException } from '@nestjs/common';

export const MAX_MINOR = 9_223_372_036_854_775_807n;

export const POSITIVE_MINOR_PATTERN = '^[1-9][0-9]*$';

const POSITIVE_MINOR_REGEX = new RegExp(POSITIVE_MINOR_PATTERN);

export function parseMinorAmount(value: string): bigint {
  if (!POSITIVE_MINOR_REGEX.test(value)) {
    throw new BadRequestException(
      'Minor-unit amounts must be positive integer strings.',
    );
  }
  const amount = BigInt(value);
  if (amount > MAX_MINOR) {
    throw new BadRequestException('Minor-unit amount exceeds 64-bit range.');
  }
  return amount;
}
