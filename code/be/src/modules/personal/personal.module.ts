import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { IdempotencyModule } from '../idempotency';
import { PersonalController } from './personal.controller';
import { PersonalRepository } from './personal.repository';
import { PersonalService } from './personal.service';

@Module({
  imports: [DatabaseModule, IdempotencyModule],
  controllers: [PersonalController],
  providers: [PersonalRepository, PersonalService],
  exports: [PersonalService],
})
export class PersonalModule {}
