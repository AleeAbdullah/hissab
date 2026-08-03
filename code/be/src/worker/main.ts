import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { WorkerModule } from './worker.module';

async function bootstrapWorker(): Promise<void> {
  const application = await NestFactory.createApplicationContext(WorkerModule);
  application.enableShutdownHooks();
}

void bootstrapWorker().catch((error: unknown) => {
  const logger = new Logger('WorkerBootstrap');
  logger.error(
    'The background worker failed to start.',
    error instanceof Error ? error.stack : undefined,
  );
  process.exitCode = 1;
});
