import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DatabaseTransaction } from '../../database/database.service';
import { activityEvents } from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import type { CreateGroupDto, InviteGroupUserDto, UpdateGroupDto } from './dto';
import {
  type GroupInvitationView,
  type GroupMemberView,
  type GroupMembershipRow,
  type GroupView,
  GroupsRepository,
} from './groups.repository';

@Injectable()
export class GroupsService {
  constructor(
    private readonly repository: GroupsRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  createGroup(
    userId: string,
    idempotencyKey: string,
    dto: CreateGroupDto,
  ): Promise<GroupView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 201,
        routeScope: 'groups:create',
      },
      async (transaction) => {
        if (!(await this.repository.isActiveUser(userId, transaction))) {
          throw new NotFoundException('User not found.');
        }
        const group = await this.repository.createGroup(
          transaction,
          userId,
          dto.name,
        );
        await this.recordChange(transaction, userId, group.id, 'CREATED', {
          name: group.name,
        });
        return group;
      },
    );
  }

  listGroups(userId: string): Promise<GroupView[]> {
    return this.repository.listGroups(userId);
  }

  async getGroup(userId: string, groupId: string): Promise<GroupView> {
    const group = await this.repository.findGroup(userId, groupId);
    if (!group) {
      throw new NotFoundException('Group not found.');
    }
    return group;
  }

  updateGroup(
    userId: string,
    groupId: string,
    idempotencyKey: string,
    dto: UpdateGroupDto,
  ): Promise<{ groupId: string; name: string }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId, ...dto },
        responseStatus: 200,
        routeScope: 'groups:update',
      },
      async (transaction) => {
        await this.requireActiveMember(transaction, groupId, userId);
        await this.repository.updateName(transaction, groupId, dto.name);
        await this.recordChange(transaction, userId, groupId, 'UPDATED', {
          name: dto.name,
        });
        return { groupId, name: dto.name };
      },
    );
  }

  async listMembers(
    userId: string,
    groupId: string,
  ): Promise<GroupMemberView[]> {
    await this.getGroup(userId, groupId);
    return this.repository.listMembers(groupId);
  }

  async listGroupInvitations(
    userId: string,
    groupId: string,
  ): Promise<GroupInvitationView[]> {
    const group = await this.getGroup(userId, groupId);
    if (group.status !== 'ACTIVE' || group.membershipStatus !== 'ACTIVE') {
      throw new NotFoundException('Group not found.');
    }
    return this.repository.listGroupInvitations(groupId);
  }

  listIncomingInvitations(userId: string): Promise<GroupInvitationView[]> {
    return this.repository.listIncomingInvitations(userId);
  }

  inviteUser(
    userId: string,
    groupId: string,
    idempotencyKey: string,
    dto: InviteGroupUserDto,
  ): Promise<{
    groupId: string;
    userId: string;
    status: 'INVITED';
    invitedAt: Date;
  }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId, ...dto },
        responseStatus: 201,
        routeScope: 'groups:invite',
      },
      async (transaction) => {
        await this.requireActiveMember(transaction, groupId, userId);
        if (!(await this.repository.isActiveUser(dto.userId, transaction))) {
          throw new NotFoundException('User not found.');
        }
        if (
          await this.repository.isEitherUserBlocked(
            userId,
            dto.userId,
            transaction,
          )
        ) {
          throw new ForbiddenException('Group invitation is not allowed.');
        }

        const existing = await this.repository.findMembership(
          groupId,
          dto.userId,
          transaction,
        );
        if (existing?.status === 'ACTIVE') {
          throw new ConflictException('The user is already a group member.');
        }
        if (existing?.status === 'INVITED') {
          throw new ConflictException(
            'A group invitation is already pending for this user.',
          );
        }

        const invitation = await this.repository.saveInvitation(
          transaction,
          groupId,
          dto.userId,
          userId,
        );
        await this.recordChange(
          transaction,
          userId,
          groupId,
          'INVITATION_SENT',
          { invitedUserId: dto.userId },
        );
        return {
          groupId,
          userId: dto.userId,
          status: 'INVITED',
          invitedAt: invitation.invitedAt!,
        };
      },
    );
  }

  cancelInvitation(
    userId: string,
    groupId: string,
    invitedUserId: string,
    idempotencyKey: string,
  ): Promise<{ groupId: string; userId: string; status: 'CANCELLED' }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId, invitedUserId },
        responseStatus: 200,
        routeScope: 'groups:cancel-invitation',
      },
      async (transaction) => {
        await this.requireActiveMember(transaction, groupId, userId);
        const invitation = await this.requirePendingInvitation(
          transaction,
          groupId,
          invitedUserId,
        );
        await this.repository.transitionInvitation(
          transaction,
          invitation,
          'CANCELLED',
        );
        await this.recordChange(
          transaction,
          userId,
          groupId,
          'INVITATION_CANCELLED',
          { invitedUserId },
        );
        return { groupId, userId: invitedUserId, status: 'CANCELLED' };
      },
    );
  }

  acceptInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
  ): Promise<{ groupId: string; status: 'ACTIVE'; joinedAt: Date }> {
    return this.resolveInvitation(userId, groupId, idempotencyKey, 'ACTIVE');
  }

  declineInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
  ): Promise<{ groupId: string; status: 'DECLINED' }> {
    return this.resolveInvitation(userId, groupId, idempotencyKey, 'DECLINED');
  }

  leaveGroup(
    userId: string,
    groupId: string,
    idempotencyKey: string,
  ): Promise<{
    groupId: string;
    status: 'LEFT';
    groupArchived: boolean;
  }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId },
        responseStatus: 200,
        routeScope: 'groups:leave',
      },
      async (transaction) => {
        await this.requireActiveMember(transaction, groupId, userId);
        if (
          await this.repository.hasUnsettledBalance(
            transaction,
            groupId,
            userId,
          )
        ) {
          throw new ConflictException(
            'Settle all group balances before leaving.',
          );
        }

        await this.repository.leaveGroup(transaction, groupId, userId);
        await this.recordChange(transaction, userId, groupId, 'MEMBER_LEFT', {
          userId,
        });

        const groupArchived =
          (await this.repository.countActiveMembers(transaction, groupId)) ===
          0;
        if (groupArchived) {
          const cancelledInvitationUserIds = await this.repository.archiveGroup(
            transaction,
            groupId,
          );
          await this.recordChange(transaction, userId, groupId, 'ARCHIVED', {
            reason: 'LAST_MEMBER_LEFT',
            cancelledInvitationUserIds,
          });
        }

        return { groupId, status: 'LEFT', groupArchived };
      },
    );
  }

  archiveGroup(
    userId: string,
    groupId: string,
    idempotencyKey: string,
  ): Promise<{ groupId: string; status: 'ARCHIVED' }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId },
        responseStatus: 200,
        routeScope: 'groups:archive',
      },
      async (transaction) => {
        await this.requireActiveMember(transaction, groupId, userId);
        if (
          await this.repository.groupHasUnsettledBalance(transaction, groupId)
        ) {
          throw new ConflictException(
            'Settle all group balances before archiving.',
          );
        }
        const cancelledInvitationUserIds = await this.repository.archiveGroup(
          transaction,
          groupId,
        );
        await this.recordChange(transaction, userId, groupId, 'ARCHIVED', {
          cancelledInvitationUserIds,
        });
        return { groupId, status: 'ARCHIVED' };
      },
    );
  }

  private resolveInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
    status: 'ACTIVE',
  ): Promise<{ groupId: string; status: 'ACTIVE'; joinedAt: Date }>;
  private resolveInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
    status: 'DECLINED',
  ): Promise<{ groupId: string; status: 'DECLINED' }>;
  private resolveInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
    status: 'ACTIVE' | 'DECLINED',
  ): Promise<
    | { groupId: string; status: 'ACTIVE'; joinedAt: Date }
    | { groupId: string; status: 'DECLINED' }
  > {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId },
        responseStatus: 200,
        routeScope: `group-invitations:${status.toLowerCase()}`,
      },
      async (transaction) => {
        const group = await this.repository.lockGroup(transaction, groupId);
        if (!group || group.status !== 'ACTIVE') {
          throw new NotFoundException('Group invitation not found.');
        }
        const invitation = await this.requirePendingInvitation(
          transaction,
          groupId,
          userId,
        );
        if (
          !invitation.invitedByUserId ||
          (await this.repository.isEitherUserBlocked(
            invitation.invitedByUserId,
            userId,
            transaction,
          ))
        ) {
          throw new ForbiddenException('Group invitation is not allowed.');
        }

        const membership = await this.repository.transitionInvitation(
          transaction,
          invitation,
          status,
        );
        const eventType =
          status === 'ACTIVE' ? 'INVITATION_ACCEPTED' : 'INVITATION_DECLINED';
        await this.recordChange(transaction, userId, groupId, eventType, {
          invitedUserId: userId,
        });
        return status === 'ACTIVE'
          ? { groupId, status, joinedAt: membership.joinedAt! }
          : { groupId, status };
      },
    );
  }

  private async requireActiveMember(
    transaction: DatabaseTransaction,
    groupId: string,
    userId: string,
  ): Promise<void> {
    const group = await this.repository.lockGroup(transaction, groupId);
    if (!group) {
      throw new NotFoundException('Group not found.');
    }
    const membership = await this.repository.findMembership(
      groupId,
      userId,
      transaction,
    );
    if (membership?.status !== 'ACTIVE') {
      throw new NotFoundException('Group not found.');
    }
    if (group.status !== 'ACTIVE') {
      throw new ConflictException('Archived groups are read-only.');
    }
  }

  private async requirePendingInvitation(
    transaction: DatabaseTransaction,
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipRow> {
    const invitation = await this.repository.findMembership(
      groupId,
      userId,
      transaction,
    );
    if (invitation?.status !== 'INVITED') {
      throw new NotFoundException('Group invitation not found.');
    }
    return invitation;
  }

  private async recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    groupId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await transaction.insert(activityEvents).values({
      actorUserId,
      ledgerId: groupId,
      eventType: `GROUP_${eventType}`,
      aggregateType: 'GROUP',
      aggregateId: groupId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: `group.${eventType.toLowerCase()}`,
      aggregateType: 'group',
      aggregateId: groupId,
      payload: { actorUserId, ...payload },
    });
  }
}
