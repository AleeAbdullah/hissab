import {
  BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';

import {
  OutboxHandlerRegistry,
  OutboxService,
  type ClaimedOutboxEvent,
  type OutboxHandler,
} from '../modules/outbox';
import {
  OUTBOX_WORKER_OPTIONS,
  type OutboxWorkerOptions,
} from './outbox-worker.options';

export class OutboxHandlerTimeoutError extends Error {
  constructor(event: ClaimedOutboxEvent, timeoutMs: number) {
    super(
      `Outbox handler for event ${event.id} timed out after ${timeoutMs}ms.`,
    );
    this.name = 'OutboxHandlerTimeoutError';
  }
}

@Injectable()
export class OutboxPollingService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(OutboxPollingService.name);
  private timer: NodeJS.Timeout | undefined;
  private activePoll: Promise<number> | undefined;
  private stopping = false;

  constructor(
    private readonly outbox: OutboxService,
    private readonly handlers: OutboxHandlerRegistry,
    @Inject(OUTBOX_WORKER_OPTIONS)
    private readonly options: OutboxWorkerOptions,
  ) {}

  onApplicationBootstrap(): void {
    this.validateOptions();
    this.stopping = false;

    if (!this.options.enabled) {
      this.logger.log('Outbox polling is disabled.');
      return;
    }

    this.scheduleNextPoll(0);
  }

  async beforeApplicationShutdown(): Promise<void> {
    this.stopping = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.activePoll) {
      await this.activePoll.catch(() => undefined);
    }
  }

  async pollOnce(): Promise<number> {
    const events = await this.outbox.claim(
      this.options.workerId,
      this.options.batchSize,
      this.options.leaseDurationMs,
    );

    const results = await Promise.allSettled(
      events.map((event) => this.processEvent(event)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const eventId = events[index]?.id ?? 'unknown';
        this.logger.error(
          `Could not update outbox state for event ${eventId}.`,
          result.reason instanceof Error ? result.reason.stack : undefined,
        );
      }
    });

    return events.length;
  }

  private scheduleNextPoll(delayMs: number): void {
    if (this.stopping) {
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.runScheduledPoll();
    }, delayMs);
  }

  private async runScheduledPoll(): Promise<void> {
    if (this.stopping || this.activePoll) {
      return;
    }

    const poll = this.pollOnce();
    this.activePoll = poll;
    let nextDelayMs = this.options.pollIntervalMs;

    try {
      const claimedCount = await poll;
      if (claimedCount === this.options.batchSize) {
        nextDelayMs = 0;
      }
    } catch (error) {
      this.logger.error(
        'Outbox polling failed.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      if (this.activePoll === poll) {
        this.activePoll = undefined;
      }
      this.scheduleNextPoll(nextDelayMs);
    }
  }

  private async processEvent(event: ClaimedOutboxEvent): Promise<void> {
    try {
      const handler = this.handlers.get(event.eventType);
      if (!handler) {
        throw new Error(
          `No outbox handler is registered for event type "${event.eventType}".`,
        );
      }

      await this.invokeWithTimeout(handler, event);
      const acknowledged = await this.outbox.acknowledge(event);

      if (!acknowledged) {
        this.logger.warn(
          `Skipped stale acknowledgement for outbox event ${event.id}.`,
        );
      }
    } catch (error) {
      const result = await this.outbox.recordFailure(event, error, {
        initialDelayMs: this.options.initialRetryDelayMs,
        maxDelayMs: this.options.maxRetryDelayMs,
        jitterRatio: this.options.retryJitterRatio,
      });

      if (!result.updated) {
        this.logger.warn(
          `Skipped stale failure update for outbox event ${event.id}.`,
        );
      } else if (result.disposition === 'dead-letter') {
        this.logger.error(
          `Outbox event ${event.id} reached its maximum attempts and was dead-lettered.`,
        );
      }
    }
  }

  private async invokeWithTimeout(
    handler: OutboxHandler,
    event: ClaimedOutboxEvent,
  ): Promise<void> {
    const abortController = new AbortController();
    let timeout: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        abortController.abort();
        reject(
          new OutboxHandlerTimeoutError(event, this.options.handlerTimeoutMs),
        );
      }, this.options.handlerTimeoutMs);
    });

    try {
      await Promise.race([
        handler.handle(event, abortController.signal),
        timeoutPromise,
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private validateOptions(): void {
    const positiveIntegers: Array<[keyof OutboxWorkerOptions, number]> = [
      ['pollIntervalMs', this.options.pollIntervalMs],
      ['batchSize', this.options.batchSize],
      ['leaseDurationMs', this.options.leaseDurationMs],
      ['handlerTimeoutMs', this.options.handlerTimeoutMs],
      ['initialRetryDelayMs', this.options.initialRetryDelayMs],
      ['maxRetryDelayMs', this.options.maxRetryDelayMs],
    ];

    for (const [name, value] of positiveIntegers) {
      if (!Number.isInteger(value) || value < 1) {
        throw new Error(`${name} must be a positive integer.`);
      }
    }

    if (!this.options.workerId.trim()) {
      throw new Error('workerId must not be empty.');
    }
    if (
      this.options.retryJitterRatio < 0 ||
      this.options.retryJitterRatio > 1
    ) {
      throw new Error('retryJitterRatio must be between zero and one.');
    }
    if (this.options.initialRetryDelayMs > this.options.maxRetryDelayMs) {
      throw new Error('initialRetryDelayMs must not exceed maxRetryDelayMs.');
    }
    if (this.options.handlerTimeoutMs >= this.options.leaseDurationMs) {
      throw new Error('handlerTimeoutMs must be shorter than leaseDurationMs.');
    }
  }
}
