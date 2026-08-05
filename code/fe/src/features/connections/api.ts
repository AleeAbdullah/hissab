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
  connectionsUnblock,
} from '@/api/generated/sdk.gen';
import type { BlockedUser, Connection, ConnectionCandidate, ConnectionRequest } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export const connectionsQuery = {
  queryKey: ['connections'] as const,
  queryFn: () => request<Connection[]>(() => connectionsListConnections()),
};

export const pendingRequestsQuery = {
  queryKey: ['connection-requests', 'PENDING'] as const,
  queryFn: () => request<ConnectionRequest[]>(() => connectionsListRequests({ query: { status: 'PENDING' } })),
};

export const blocksQuery = {
  queryKey: ['blocks'] as const,
  queryFn: () => request<BlockedUser[]>(() => connectionsListBlocks()),
};

export function findCandidate(email: string) {
  return request<ConnectionCandidate | null>(() => connectionsFindCandidate({ query: { email } }));
}

export function sendRequest(receiverUserId: string) {
  return request(() => connectionsSendRequest({ body: { receiverUserId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function acceptRequest(requestId: string) {
  return request(() => connectionsAcceptRequest({ path: { requestId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function declineRequest(requestId: string) {
  return request(() => connectionsDeclineRequest({ path: { requestId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function cancelRequest(requestId: string) {
  return request(() => connectionsCancelRequest({ path: { requestId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function unblock(userId: string) {
  return request(() => connectionsUnblock({ path: { userId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function block(userId: string) {
  return request(() => connectionsBlock({ path: { userId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}
