import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

@Module({
  imports: [DatabaseModule, IdempotencyModule, OutboxModule],
  controllers: [RemindersController],
  providers: [RemindersService],
})
export class RemindersModule {}
