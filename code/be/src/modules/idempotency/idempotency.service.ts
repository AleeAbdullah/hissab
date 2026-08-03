import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { IdempotencyCrypto } from './idempotency.crypto';
import { IdempotencyRepository } from './idempotency.repository';
import type { IdempotencyExecution } from './idempotency.types';

@Injectable()
export class IdempotencyService {
  private readonly retentionMilliseconds: number;

  constructor(
    private readonly database: DatabaseService,
    private readonly repository: IdempotencyRepository,
    private readonly crypto: IdempotencyCrypto,
    configService: ConfigService,
  ) {
    const seconds = Number(
      configService.get<string>('IDEMPOTENCY_TTL_SECONDS') ?? 86_400,
    );
    if (!Number.isInteger(seconds) || seconds < 60) {
      throw new Error(
        'IDEMPOTENCY_TTL_SECONDS must be an integer of at least 60.',
      );
    }
    this.retentionMilliseconds = seconds * 1_000;
  }

  async execute<TRequest, TResponse>(
    execution: IdempotencyExecution<TRequest>,
    operation: (transaction: DatabaseTransaction) => Promise<TResponse>,
  ): Promise<TResponse> {
    const actorFingerprint = this.crypto.actorFingerprint(execution.actor);
    const requestHash = this.crypto.requestFingerprint(
      execution.routeScope,
      execution.request,
    );

    return this.database.transaction(async (transaction) => {
      const claim = await this.repository.claim(transaction, {
        actorFingerprint,
        expiresAt: new Date(Date.now() + this.retentionMilliseconds),
        idempotencyKey: execution.key,
        requestHash,
        routeScope: execution.routeScope,
        userId: execution.actor.userId,
      });

      if (claim.kind === 'existing') {
        if (!this.crypto.hashesEqual(claim.requestHash, requestHash)) {
          throw new ConflictException(
            'Idempotency key was already used for a different request.',
          );
        }
        if (claim.status !== 'COMPLETED' || claim.responseBody === null) {
          throw new ConflictException(
            'A request with this idempotency key is still processing.',
          );
        }
        await execution.authorizeReplay?.(transaction);
        return this.crypto.decrypt<TResponse>(claim.responseBody);
      }

      const response = await operation(transaction);
      await this.repository.complete(
        transaction,
        claim.recordId,
        execution.responseStatus,
        this.crypto.encrypt(response),
      );
      return response;
    });
  }
}
