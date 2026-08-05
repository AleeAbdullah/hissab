import {
  groupInvitationsAccept,
  groupInvitationsDecline,
  groupInvitationsListIncoming,
  groupsArchiveGroup,
  groupsCancelInvitation,
  groupsCreateGroup,
  groupsGetGroup,
  groupsInviteUser,
  groupsLeaveGroup,
  groupsListGroups,
  groupsListInvitations,
  groupsListMembers,
  groupsUpdateGroup,
} from '@/api/generated/sdk.gen';
import type {
  Group,
  GroupArchiveResult,
  GroupInvitation,
  GroupInvitationResponse,
  GroupInvitationResult,
  GroupLeaveResult,
  GroupMember,
  GroupUpdateResult,
} from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export const groupsQuery = {
  queryKey: ['groups'] as const,
  queryFn: () => request<Group[]>(() => groupsListGroups()),
};

export const incomingGroupInvitationsQuery = {
  queryKey: ['group-invitations'] as const,
  queryFn: () => request<GroupInvitation[]>(() => groupInvitationsListIncoming()),
};

export function groupQuery(groupId: string) {
  return {
    queryKey: ['groups', groupId] as const,
    queryFn: () => request<Group>(() => groupsGetGroup({ path: { groupId } })),
  };
}

export function groupMembersQuery(groupId: string) {
  return {
    queryKey: ['groups', groupId, 'members'] as const,
    queryFn: () => request<GroupMember[]>(() => groupsListMembers({ path: { groupId } })),
  };
}

export function groupInvitationsQuery(groupId: string) {
  return {
    queryKey: ['groups', groupId, 'invitations'] as const,
    queryFn: () => request<GroupInvitation[]>(() => groupsListInvitations({ path: { groupId } })),
  };
}

export function createGroup(name: string) {
  return request<Group>(() => groupsCreateGroup({ body: { name }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function updateGroup(groupId: string, name: string) {
  return request<GroupUpdateResult>(() => groupsUpdateGroup({ path: { groupId }, body: { name }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function inviteGroupUser(groupId: string, userId: string) {
  return request<GroupInvitationResult>(() => groupsInviteUser({ path: { groupId }, body: { userId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function cancelGroupInvitation(groupId: string, userId: string) {
  return request<GroupInvitationResult>(() => groupsCancelInvitation({ path: { groupId, userId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function acceptGroupInvitation(groupId: string) {
  return request<GroupInvitationResponse>(() => groupInvitationsAccept({ path: { groupId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function declineGroupInvitation(groupId: string) {
  return request<GroupInvitationResponse>(() => groupInvitationsDecline({ path: { groupId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function leaveGroup(groupId: string) {
  return request<GroupLeaveResult>(() => groupsLeaveGroup({ path: { groupId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function archiveGroup(groupId: string) {
  return request<GroupArchiveResult>(() => groupsArchiveGroup({ path: { groupId }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}
