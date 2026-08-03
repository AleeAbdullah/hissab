import type { DatabaseTransaction } from '../../database/database.service';

export type OutboxPayload = Record<string, unknown>;

export type OutboxTransaction = DatabaseTransaction;

export interface EnqueueOutboxEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: OutboxPayload;
  availableAt?: Date;
  maxAttempts?: number;
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: OutboxPayload;
  availableAt: Date;
  attemptCount: number;
  maxAttempts: number;
  claimToken: string | null;
  claimedBy: string | null;
  leaseExpiresAt: Date | null;
  processedAt: Date | null;
  deadLetteredAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClaimedOutboxEvent extends OutboxEvent {
  claimToken: string;
  claimedBy: string;
  leaseExpiresAt: Date;
}

export interface OutboxHandler {
  readonly eventTypes: readonly string[];
  handle(event: ClaimedOutboxEvent, signal: AbortSignal): Promise<void>;
}

export interface RetryBackoffOptions {
  initialDelayMs: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export type OutboxFailureDisposition = 'retry' | 'dead-letter';

export interface OutboxFailureResult {
  disposition: OutboxFailureDisposition;
  updated: boolean;
  retryDelayMs?: number;
}
