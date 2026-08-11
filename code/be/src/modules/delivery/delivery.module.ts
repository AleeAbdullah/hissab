import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox';
import { DomainEventHandler } from './domain-event.handler';
import { ExpoPushHandler } from './expo-push.handler';
import { NoopEventHandler } from './noop-event.handler';

@Module({
  imports: [OutboxModule],
  providers: [DomainEventHandler, ExpoPushHandler, NoopEventHandler],
})
export class DeliveryModule {}
