import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import {
  GroupInvitationsController,
  GroupsController,
} from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [GroupsController, GroupInvitationsController],
  providers: [GroupsRepository, GroupsService],
})
export class GroupsModule {}
