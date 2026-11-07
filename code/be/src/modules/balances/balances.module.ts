import { Module } from '@nestjs/common';

import { LedgersModule } from '../ledgers';
import { BalancesController } from './balances.controller';
import { BalancesRepository } from './balances.repository';
import { BalancesService } from './balances.service';

@Module({
  imports: [LedgersModule],
  controllers: [BalancesController],
  providers: [BalancesRepository, BalancesService],
  exports: [BalancesRepository, BalancesService],
})
export class BalancesModule {}
