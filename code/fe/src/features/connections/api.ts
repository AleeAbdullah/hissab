import type {
  BlockedUser,
  Connection,
  ConnectionCandidate,
  ConnectionRequest
} from '@/api/contracts';
import {
  connectionsAcceptRequest,
  connectionsBlock,
  connectionsCancelRequest,
  connectionsDeclineRequest,
  connectionsFindCandidate,
  connectionsListBlocks,
  connectionsListConnections,
  connectionsListRequests,
  connectionsSendRequest,
  connectionsUnblock
} from '@/api/generated/sdk.gen';
import { idempotencyKey, request } from '@/api/transport';

export const connectionsQuery = {
  queryKey: ['connections'] as const,
  queryFn: () => request<Connection[]>(() => connectionsListConnections())
};

export const pendingRequestsQuery = {
  queryKey: ['connection-requests', 'PENDING'] as const,
  queryFn: () =>
    request<ConnectionRequest[]>(() =>
      connectionsListRequests({ query: { status: 'PENDING' } })
    )
};

export const blocksQuery = {
  queryKey: ['blocks'] as const,
  queryFn: () => request<BlockedUser[]>(() => connectionsListBlocks())
};

export function normalizeConnectionCandidate(
  value: unknown
): ConnectionCandidate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const nonempty = (field: unknown): field is string =>
    typeof field === 'string' && field.trim().length > 0;
  if (
    !nonempty(candidate.userId) ||
    !nonempty(candidate.displayName) ||
    !nonempty(candidate.email) ||
    !candidate.email.includes('@') ||
    !(candidate.ledgerId === null || nonempty(candidate.ledgerId)) ||
    !(candidate.requestId === null || nonempty(candidate.requestId))
  )
    return null;
  switch (candidate.state) {
    case 'AVAILABLE':
      if (candidate.ledgerId !== null || candidate.requestId !== null)
        return null;
      break;
    case 'CONNECTED':
      if (!candidate.ledgerId) return null;
      break;
    case 'PENDING_INCOMING':
    case 'PENDING_OUTGOING':
      if (candidate.ledgerId !== null || !candidate.requestId) return null;
      break;
    default:
      return null;
  }
  return {
    userId: candidate.userId,
    displayName: candidate.displayName.trim(),
    email: candidate.email.trim(),
    state: candidate.state,
    ledgerId: candidate.ledgerId,
    requestId: candidate.requestId
  };
}

export async function findCandidate(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const candidate = normalizeConnectionCandidate(
    await request<unknown>(() =>
      connectionsFindCandidate({ query: { email: normalizedEmail } })
    )
  );
  return candidate?.email.toLowerCase() === normalizedEmail ? candidate : null;
}

export function sendRequest(receiverUserId: string) {
  return request(() =>
    connectionsSendRequest({
      body: { receiverUserId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function acceptRequest(requestId: string) {
  return request(() =>
    connectionsAcceptRequest({
      path: { requestId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function declineRequest(requestId: string) {
  return request(() =>
    connectionsDeclineRequest({
      path: { requestId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function cancelRequest(requestId: string) {
  return request(() =>
    connectionsCancelRequest({
      path: { requestId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function unblock(userId: string) {
  return request(() =>
    connectionsUnblock({
      path: { userId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function block(userId: string) {
  return request(() =>
    connectionsBlock({
      path: { userId },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}
