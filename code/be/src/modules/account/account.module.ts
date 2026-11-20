import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth';
import { GroupsModule } from '../groups';
import { IdempotencyModule } from '../idempotency';
import { SettlementsModule } from '../settlements';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    GroupsModule,
    IdempotencyModule,
    SettlementsModule,
  ],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
})
export class AccountModule {}
