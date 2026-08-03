import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EncryptedPayload, IdempotencyActor } from './idempotency.types';

@Injectable()
export class IdempotencyCrypto {
  private readonly encryptionKey: Buffer;
  private readonly hmacKey: Buffer;
  private readonly keyId: string;

  constructor(configService: ConfigService) {
    this.encryptionKey = decode32ByteKey(
      configService.getOrThrow<string>('IDEMPOTENCY_ENCRYPTION_KEY'),
      'IDEMPOTENCY_ENCRYPTION_KEY',
    );
    this.hmacKey = Buffer.from(
      configService.getOrThrow<string>('IDEMPOTENCY_HMAC_SECRET'),
      'utf8',
    );
    this.keyId = configService.get<string>('IDEMPOTENCY_KEY_ID') ?? 'v1';
  }

  actorFingerprint(actor: IdempotencyActor): string {
    return this.hmac({ kind: actor.kind, subject: actor.subject });
  }

  requestFingerprint(routeScope: string, request: unknown): string {
    return this.hmac({ request, routeScope });
  }

  encrypt(value: unknown): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(stableStringify(value), 'utf8'),
      cipher.final(),
    ]);

    return {
      algorithm: 'A256GCM',
      ciphertext: ciphertext.toString('base64url'),
      iv: iv.toString('base64url'),
      keyId: this.keyId,
      tag: cipher.getAuthTag().toString('base64url'),
    };
  }

  decrypt<T>(payload: unknown): T {
    if (!isEncryptedPayload(payload) || payload.keyId !== this.keyId) {
      throw new Error('Unsupported encrypted idempotency response.');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(payload.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');

    return JSON.parse(plaintext) as T;
  }

  hashesEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private hmac(value: unknown): string {
    return createHmac('sha256', this.hmacKey)
      .update(stableStringify(value))
      .digest('hex');
  }
}

function decode32ByteKey(value: string, name: string): Buffer {
  const base64 = Buffer.from(value, 'base64');
  if (
    base64.length === 32 &&
    base64.toString('base64').replace(/=+$/, '') === value.replace(/=+$/, '')
  ) {
    return base64;
  }

  const utf8 = Buffer.from(value, 'utf8');
  if (utf8.length === 32) {
    return utf8;
  }

  throw new Error(`${name} must contain exactly 32 bytes.`);
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<EncryptedPayload>;
  return (
    candidate.algorithm === 'A256GCM' &&
    typeof candidate.ciphertext === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.keyId === 'string' &&
    typeof candidate.tag === 'string'
  );
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalize(entry)]),
    );
  }

  return value;
}
