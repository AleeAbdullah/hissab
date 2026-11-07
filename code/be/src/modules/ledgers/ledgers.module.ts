import { Module } from '@nestjs/common';

import { LedgerAccessRepository } from './ledger-access.repository';

@Module({
  providers: [LedgerAccessRepository],
  exports: [LedgerAccessRepository],
})
export class LedgersModule {}
