import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox';
import { StorageModule } from '../storage';
import { AttachmentStorageHandler } from './attachment-storage.handler';
import { DomainEventHandler } from './domain-event.handler';
import { ExpoPushHandler } from './expo-push.handler';
import { NoopEventHandler } from './noop-event.handler';

@Module({
  imports: [OutboxModule, StorageModule],
  providers: [
    AttachmentStorageHandler,
    DomainEventHandler,
    ExpoPushHandler,
    NoopEventHandler,
  ],
})
export class DeliveryModule {}
