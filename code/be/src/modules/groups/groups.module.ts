import { Module } from '@nestjs/common';

import { BalancesModule } from '../balances';
import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { UsersModule } from '../users';
import {
  GroupInvitationsController,
  GroupsController,
} from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

@Module({
  imports: [BalancesModule, IdempotencyModule, OutboxModule, UsersModule],
  controllers: [GroupsController, GroupInvitationsController],
  providers: [GroupsRepository, GroupsService],
})
export class GroupsModule {}
