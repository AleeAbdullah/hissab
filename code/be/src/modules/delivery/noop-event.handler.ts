import { Injectable, OnModuleInit } from '@nestjs/common';

import { type OutboxHandler, OutboxHandlerRegistry } from '../outbox';

@Injectable()
export class NoopEventHandler implements OutboxHandler, OnModuleInit {
  readonly eventTypes = [
    'auth.user_registered',
    'auth.user_signed_in',
    'auth.password_reset',
    'auth.password_changed',
    'user.profile_updated',
  ];

  constructor(private readonly registry: OutboxHandlerRegistry) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  handle(): Promise<void> {
    return Promise.resolve();
  }
}
