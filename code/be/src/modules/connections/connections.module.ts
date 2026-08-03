import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency/idempotency.module';
import { OutboxModule } from '../outbox/outbox.module';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsRepository, ConnectionsService],
})
export class ConnectionsModule {}
