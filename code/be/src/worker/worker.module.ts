import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  type EnvironmentVariables,
  validateEnvironment,
} from '../config/environment';
import { OutboxModule } from '../modules/outbox';
import { OutboxPollingService } from './outbox-polling.service';
import {
  createDefaultOutboxWorkerOptions,
  OUTBOX_WORKER_OPTIONS,
} from './outbox-worker.options';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    OutboxModule,
  ],
  providers: [
    {
      provide: OUTBOX_WORKER_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createDefaultOutboxWorkerOptions({
          enabled: config.getOrThrow('OUTBOX_ENABLED'),
          pollIntervalMs: config.getOrThrow('OUTBOX_POLL_INTERVAL_MS'),
          batchSize: config.getOrThrow('OUTBOX_BATCH_SIZE'),
          leaseDurationMs: config.getOrThrow('OUTBOX_LEASE_SECONDS') * 1_000,
        }),
    },
    OutboxPollingService,
  ],
})
export class WorkerModule {}
