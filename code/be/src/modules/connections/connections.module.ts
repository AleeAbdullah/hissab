import { Module } from '@nestjs/common';

import { BalancesModule } from '../balances';
import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { UsersModule } from '../users';
import { ConnectionsController } from './connections.controller';
import { ConnectionsRepository } from './connections.repository';
import { ConnectionsService } from './connections.service';

@Module({
  imports: [BalancesModule, IdempotencyModule, OutboxModule, UsersModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsRepository, ConnectionsService],
})
export class ConnectionsModule {}
