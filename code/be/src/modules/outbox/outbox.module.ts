import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { OutboxHandlerRegistry } from './outbox-handler.registry';
import { OutboxService } from './outbox.service';

@Module({
  imports: [DatabaseModule],
  providers: [OutboxHandlerRegistry, OutboxService],
  exports: [OutboxHandlerRegistry, OutboxService],
})
export class OutboxModule {}
