import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency';
import { LedgersModule } from '../ledgers';
import { OutboxModule } from '../outbox';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';

@Module({
  imports: [IdempotencyModule, LedgersModule, OutboxModule],
  controllers: [ExpensesController],
  providers: [ExpensesRepository, ExpensesService],
})
export class ExpensesModule {}
