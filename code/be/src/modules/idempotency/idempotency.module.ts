import { Module } from '@nestjs/common';

import { IdempotencyCrypto } from './idempotency.crypto';
import { IdempotencyRepository } from './idempotency.repository';
import { IdempotencyService } from './idempotency.service';

@Module({
  providers: [IdempotencyCrypto, IdempotencyRepository, IdempotencyService],
  exports: [IdempotencyCrypto, IdempotencyService],
})
export class IdempotencyModule {}
