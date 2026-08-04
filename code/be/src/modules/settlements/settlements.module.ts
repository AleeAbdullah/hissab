import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { SettlementsController } from './settlements.controller';
import { SettlementsRepository } from './settlements.repository';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [SettlementsController],
  providers: [SettlementsRepository, SettlementsService],
})
export class SettlementsModule {}
