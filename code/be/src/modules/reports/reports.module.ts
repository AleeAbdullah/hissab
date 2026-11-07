import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
