import { Injectable, OnModuleInit } from '@nestjs/common';

import {
  type ClaimedOutboxEvent,
  type OutboxHandler,
  OutboxHandlerRegistry,
} from '../outbox';
import { R2StorageService } from '../storage';

@Injectable()
export class AttachmentStorageHandler implements OutboxHandler, OnModuleInit {
  readonly eventTypes = ['attachment.object_delete_requested'] as const;

  constructor(
    private readonly registry: OutboxHandlerRegistry,
    private readonly storage: R2StorageService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(event: ClaimedOutboxEvent, signal: AbortSignal): Promise<void> {
    const objectKey = event.payload.objectKey;
    if (typeof objectKey !== 'string' || objectKey.length === 0) {
      throw new Error('Attachment deletion event is missing its object key.');
    }
    await this.storage.remove(objectKey, signal);
  }
}
