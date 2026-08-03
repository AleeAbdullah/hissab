import { Injectable } from '@nestjs/common';

import type { OutboxHandler } from './outbox.types';

@Injectable()
export class OutboxHandlerRegistry {
  private readonly handlers = new Map<string, OutboxHandler>();

  register(handler: OutboxHandler): void {
    if (handler.eventTypes.length === 0) {
      throw new Error(
        'An outbox handler must declare at least one event type.',
      );
    }

    const eventTypes = handler.eventTypes.map((eventType) => eventType.trim());

    if (eventTypes.some((eventType) => eventType.length === 0)) {
      throw new Error('Outbox handler event types must not be empty.');
    }

    const duplicateInHandler = eventTypes.find(
      (eventType, index) => eventTypes.indexOf(eventType) !== index,
    );
    if (duplicateInHandler) {
      throw new Error(
        `Outbox handler declares event type "${duplicateInHandler}" more than once.`,
      );
    }

    const existingType = eventTypes.find((eventType) =>
      this.handlers.has(eventType),
    );
    if (existingType) {
      throw new Error(
        `An outbox handler is already registered for event type "${existingType}".`,
      );
    }

    for (const eventType of eventTypes) {
      this.handlers.set(eventType, handler);
    }
  }

  get(eventType: string): OutboxHandler | undefined {
    return this.handlers.get(eventType);
  }
}
