import { Module } from '@nestjs/common';

import { IdempotencyModule } from '../idempotency';
import { OutboxModule } from '../outbox';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [IdempotencyModule, OutboxModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
})
export class UsersModule {}
