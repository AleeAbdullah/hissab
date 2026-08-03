import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import { outboxEvents } from '../../database/schema';
import { calculateRetryDelayMs, serializeOutboxError } from './outbox.retry';
import type {
  ClaimedOutboxEvent,
  EnqueueOutboxEvent,
  OutboxEvent,
  OutboxFailureResult,
  OutboxPayload,
  OutboxTransaction,
  RetryBackoffOptions,
} from './outbox.types';

interface OutboxDatabaseRow {
  id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: OutboxPayload;
  available_at: Date;
  attempt_count: number;
  max_attempts: number;
  claim_token: string | null;
  claimed_by: string | null;
  lease_expires_at: Date | null;
  processed_at: Date | null;
  dead_lettered_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

const RETURNING_COLUMNS = `
  event.id AS id,
  event.event_type AS event_type,
  event.aggregate_type AS aggregate_type,
  event.aggregate_id AS aggregate_id,
  event.payload AS payload,
  event.available_at AS available_at,
  event.attempt_count AS attempt_count,
  event.max_attempts AS max_attempts,
  event.claim_token AS claim_token,
  event.claimed_by AS claimed_by,
  event.lease_expires_at AS lease_expires_at,
  event.processed_at AS processed_at,
  event.dead_lettered_at AS dead_lettered_at,
  event.last_error AS last_error,
  event.created_at AS created_at,
  event.updated_at AS updated_at
`;

@Injectable()
export class OutboxService {
  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async enqueue(
    transaction: OutboxTransaction,
    event: EnqueueOutboxEvent,
  ): Promise<OutboxEvent> {
    this.validateEnqueueEvent(event);

    const [inserted] = await transaction
      .insert(outboxEvents)
      .values({
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
        maxAttempts:
          event.maxAttempts ?? this.config.getOrThrow('OUTBOX_MAX_ATTEMPTS'),
        ...(event.availableAt ? { availableAt: event.availableAt } : {}),
      })
      .returning();

    if (!inserted) {
      throw new Error('The outbox event insert returned no row.');
    }

    return inserted;
  }

  async claim(
    claimedBy: string,
    batchSize: number,
    leaseDurationMs: number,
  ): Promise<ClaimedOutboxEvent[]> {
    if (!claimedBy.trim()) {
      throw new Error('claimedBy must not be empty.');
    }
    if (!Number.isInteger(batchSize) || batchSize < 1) {
      throw new Error('batchSize must be a positive integer.');
    }
    if (!Number.isFinite(leaseDurationMs) || leaseDurationMs <= 0) {
      throw new Error('leaseDurationMs must be greater than zero.');
    }

    const client = await this.database.pool.connect();
    const claimToken = randomUUID();

    try {
      await client.query('BEGIN');
      const result = await client.query<OutboxDatabaseRow>(
        `
          WITH candidates AS (
            SELECT id
            FROM outbox_events
            WHERE processed_at IS NULL
              AND dead_lettered_at IS NULL
              AND available_at <= clock_timestamp()
              AND (
                lease_expires_at IS NULL
                OR lease_expires_at <= clock_timestamp()
              )
            ORDER BY available_at, created_at, id
            LIMIT $1
            FOR UPDATE SKIP LOCKED
          )
          UPDATE outbox_events AS event
          SET claim_token = $2::uuid,
              claimed_by = $3,
              lease_expires_at = clock_timestamp()
                + ($4::double precision * interval '1 millisecond'),
              attempt_count = event.attempt_count + 1,
              updated_at = clock_timestamp()
          FROM candidates
          WHERE event.id = candidates.id
          RETURNING ${RETURNING_COLUMNS}
        `,
        [batchSize, claimToken, claimedBy, leaseDurationMs],
      );
      await client.query('COMMIT');

      return result.rows.map((row) => this.toClaimedEvent(row));
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async acknowledge(event: ClaimedOutboxEvent): Promise<boolean> {
    const result = await this.database.pool.query<{ id: string }>(
      `
        UPDATE outbox_events
        SET processed_at = clock_timestamp(),
            claim_token = NULL,
            claimed_by = NULL,
            lease_expires_at = NULL,
            last_error = NULL,
            updated_at = clock_timestamp()
        WHERE id = $1::uuid
          AND claim_token = $2::uuid
          AND processed_at IS NULL
          AND dead_lettered_at IS NULL
        RETURNING id
      `,
      [event.id, event.claimToken],
    );

    return result.rowCount === 1;
  }

  async recordFailure(
    event: ClaimedOutboxEvent,
    error: unknown,
    retryOptions: RetryBackoffOptions,
    randomValue = Math.random(),
  ): Promise<OutboxFailureResult> {
    const lastError = serializeOutboxError(error);

    if (event.attemptCount >= event.maxAttempts) {
      const result = await this.database.pool.query<{ id: string }>(
        `
          UPDATE outbox_events
          SET dead_lettered_at = clock_timestamp(),
              claim_token = NULL,
              claimed_by = NULL,
              lease_expires_at = NULL,
              last_error = $3,
              updated_at = clock_timestamp()
          WHERE id = $1::uuid
            AND claim_token = $2::uuid
            AND processed_at IS NULL
            AND dead_lettered_at IS NULL
          RETURNING id
        `,
        [event.id, event.claimToken, lastError],
      );

      return {
        disposition: 'dead-letter',
        updated: result.rowCount === 1,
      };
    }

    const retryDelayMs = calculateRetryDelayMs(
      event.attemptCount,
      retryOptions,
      randomValue,
    );
    const result = await this.database.pool.query<{ id: string }>(
      `
        UPDATE outbox_events
        SET available_at = clock_timestamp()
              + ($3::double precision * interval '1 millisecond'),
            claim_token = NULL,
            claimed_by = NULL,
            lease_expires_at = NULL,
            last_error = $4,
            updated_at = clock_timestamp()
        WHERE id = $1::uuid
          AND claim_token = $2::uuid
          AND processed_at IS NULL
          AND dead_lettered_at IS NULL
        RETURNING id
      `,
      [event.id, event.claimToken, retryDelayMs, lastError],
    );

    return {
      disposition: 'retry',
      retryDelayMs,
      updated: result.rowCount === 1,
    };
  }

  private validateEnqueueEvent(event: EnqueueOutboxEvent): void {
    if (!event.eventType.trim()) {
      throw new Error('eventType must not be empty.');
    }
    if (!event.aggregateType.trim()) {
      throw new Error('aggregateType must not be empty.');
    }
    if (
      event.payload === null ||
      Array.isArray(event.payload) ||
      typeof event.payload !== 'object'
    ) {
      throw new Error('payload must be a JSON object.');
    }
    if (
      event.maxAttempts !== undefined &&
      (!Number.isInteger(event.maxAttempts) || event.maxAttempts < 1)
    ) {
      throw new Error('maxAttempts must be a positive integer.');
    }
  }

  private toClaimedEvent(row: OutboxDatabaseRow): ClaimedOutboxEvent {
    if (!row.claim_token || !row.claimed_by || !row.lease_expires_at) {
      throw new Error(
        `Claimed outbox event ${row.id} has incomplete lease data.`,
      );
    }

    return {
      id: row.id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: row.payload,
      availableAt: row.available_at,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      claimToken: row.claim_token,
      claimedBy: row.claimed_by,
      leaseExpiresAt: row.lease_expires_at,
      processedAt: row.processed_at,
      deadLetteredAt: row.dead_lettered_at,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
