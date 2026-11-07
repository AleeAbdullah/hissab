import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox';
import { StorageModule } from '../storage';
import { AttachmentStorageHandler } from './attachment-storage.handler';
import { DomainEventHandler } from './domain-event.handler';
import { EmailHandler } from './email.handler';
import { ExpoPushHandler } from './expo-push.handler';

@Module({
  imports: [OutboxModule, StorageModule],
  providers: [
    AttachmentStorageHandler,
    DomainEventHandler,
    EmailHandler,
    ExpoPushHandler,
  ],
})
export class DeliveryModule {}
