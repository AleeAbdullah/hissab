import { Module } from '@nestjs/common';

import { BalancesController } from './balances.controller';
import { BalancesRepository } from './balances.repository';
import { BalancesService } from './balances.service';

@Module({
  controllers: [BalancesController],
  providers: [BalancesRepository, BalancesService],
  exports: [BalancesService],
})
export class BalancesModule {}
