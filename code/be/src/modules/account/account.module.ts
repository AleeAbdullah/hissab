import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth';
import { IdempotencyModule } from '../idempotency';
import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';

@Module({
  imports: [DatabaseModule, AuthModule, IdempotencyModule],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
})
export class AccountModule {}
