import type { DatabaseTransaction } from '../../database/database.service';

export interface IdempotencyActor {
  kind: 'email' | 'refresh-token' | 'reset-token' | 'user';
  subject: string;
  userId?: string;
}

export interface IdempotencyExecution<TRequest> {
  actor: IdempotencyActor;
  key: string;
  request: TRequest;
  responseStatus: number;
  routeScope: string;
  authorizeReplay?: (transaction: DatabaseTransaction) => Promise<void>;
}

export interface EncryptedPayload {
  algorithm: 'A256GCM';
  ciphertext: string;
  iv: string;
  keyId: string;
  tag: string;
}

export type IdempotencyClaim =
  | { kind: 'acquired'; recordId: string }
  | {
      kind: 'existing';
      requestHash: string;
      responseBody: unknown;
      status: 'COMPLETED' | 'PROCESSING';
    };
