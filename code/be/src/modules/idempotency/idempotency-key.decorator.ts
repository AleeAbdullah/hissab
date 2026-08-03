import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

export function parseIdempotencyKey(value: unknown): string {
  if (Array.isArray(value)) {
    throw new BadRequestException(
      'Exactly one Idempotency-Key header is required.',
    );
  }

  if (typeof value !== 'string' || value.length === 0) {
    throw new BadRequestException('Idempotency-Key header is required.');
  }

  if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
    throw new BadRequestException(
      'Idempotency-Key must be 16-128 URL-safe ASCII characters.',
    );
  }

  return value;
}

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    return parseIdempotencyKey(request.headers['idempotency-key']);
  },
);
