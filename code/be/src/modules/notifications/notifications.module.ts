import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { IdempotencyModule } from '../idempotency';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [DatabaseModule, IdempotencyModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
