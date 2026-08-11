import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, eq, lte } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { idempotencyKeys } from '../../database/schema';
import type { IdempotencyClaim } from './idempotency.types';

interface ClaimInput {
  actorFingerprint: string;
  expiresAt: Date;
  idempotencyKey: string;
  requestHash: string;
  routeScope: string;
  userId?: string;
}

@Injectable()
export class IdempotencyRepository {
  constructor(private readonly database: DatabaseService) {}

  async claim(
    transaction: DatabaseTransaction,
    input: ClaimInput,
  ): Promise<IdempotencyClaim> {
    const now = new Date();
    const recordId = randomUUID();
    await transaction
      .delete(idempotencyKeys)
      .where(lte(idempotencyKeys.expiresAt, now));
    const [inserted] = await transaction
      .insert(idempotencyKeys)
      .values({
        id: recordId,
        actorFingerprint: input.actorFingerprint,
        userId: input.userId ?? null,
        routeScope: input.routeScope,
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        status: 'PROCESSING',
        lockToken: randomUUID(),
        lockedUntil: new Date(now.getTime() + 5 * 60_000),
        expiresAt: input.expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning({ id: idempotencyKeys.id });

    if (inserted) {
      return { kind: 'acquired', recordId: inserted.id };
    }

    const [existing] = await transaction
      .select({
        requestHash: idempotencyKeys.requestHash,
        responseBody: idempotencyKeys.responseBody,
        status: idempotencyKeys.status,
      })
      .from(idempotencyKeys)
      .where(
        and(
          eq(idempotencyKeys.actorFingerprint, input.actorFingerprint),
          eq(idempotencyKeys.routeScope, input.routeScope),
          eq(idempotencyKeys.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('Idempotency claim disappeared after a unique conflict.');
    }

    return {
      kind: 'existing',
      requestHash: existing.requestHash,
      responseBody: existing.responseBody,
      status: existing.status,
    };
  }

  async complete(
    transaction: DatabaseTransaction,
    recordId: string,
    responseStatus: number,
    responseBody: unknown,
  ): Promise<void> {
    await transaction
      .update(idempotencyKeys)
      .set({
        status: 'COMPLETED',
        responseStatus,
        responseBody,
        lockToken: null,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(idempotencyKeys.id, recordId));
  }

  async discard(
    transaction: DatabaseTransaction,
    recordId: string,
  ): Promise<void> {
    await transaction
      .delete(idempotencyKeys)
      .where(eq(idempotencyKeys.id, recordId));
  }
}
