import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
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

const documentIdempotencyHeader = ApiHeader({
  name: 'Idempotency-Key',
  description: 'A unique key for safely retrying this mutation.',
  required: true,
  schema: {
    type: 'string',
    minLength: 16,
    maxLength: 128,
    pattern: '^[A-Za-z0-9._:-]{16,128}$',
  },
});

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    return parseIdempotencyKey(request.headers['idempotency-key']);
  },
  [
    (target, propertyKey) => {
      if (propertyKey === undefined) {
        return;
      }
      const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
      if (descriptor) {
        documentIdempotencyHeader(target, propertyKey, descriptor);
      }
    },
  ],
);
