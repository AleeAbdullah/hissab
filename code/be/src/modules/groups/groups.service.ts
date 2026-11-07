import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { recordDomainChange } from '../../common/domain-change';
import type { DatabaseTransaction } from '../../database/database.service';
import { BalancesRepository } from '../balances/balances.repository';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import { UsersRepository } from '../users/users.repository';
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
    private readonly balances: BalancesRepository,
    private readonly users: UsersRepository,
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
        if (!(await this.users.isActiveUser(transaction, userId))) {
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
        if (!(await this.users.isActiveUser(transaction, dto.userId))) {
          throw new NotFoundException('User not found.');
        }
        await this.requirePairAllowed(transaction, userId, dto.userId);

        const existing = await this.repository.findMembership(
          transaction,
          groupId,
          dto.userId,
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
        if (!invitation.invitedAt) {
          throw new Error('Group invitation write returned no invitedAt.');
        }
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
          invitedAt: invitation.invitedAt,
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
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId },
        responseStatus: 200,
        routeScope: 'group-invitations:active',
      },
      async (transaction) => {
        const invitation = await this.requireOwnInvitation(
          transaction,
          groupId,
          userId,
        );
        const membership = await this.repository.transitionInvitation(
          transaction,
          invitation,
          'ACTIVE',
        );
        if (!membership.joinedAt) {
          throw new Error('Group invitation acceptance returned no joinedAt.');
        }
        await this.recordChange(
          transaction,
          userId,
          groupId,
          'INVITATION_ACCEPTED',
          { invitedUserId: userId },
        );
        return { groupId, status: 'ACTIVE', joinedAt: membership.joinedAt };
      },
    );
  }

  declineInvitation(
    userId: string,
    groupId: string,
    idempotencyKey: string,
  ): Promise<{ groupId: string; status: 'DECLINED' }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { groupId },
        responseStatus: 200,
        routeScope: 'group-invitations:declined',
      },
      async (transaction) => {
        const invitation = await this.requireOwnInvitation(
          transaction,
          groupId,
          userId,
        );
        await this.repository.transitionInvitation(
          transaction,
          invitation,
          'DECLINED',
        );
        await this.recordChange(
          transaction,
          userId,
          groupId,
          'INVITATION_DECLINED',
          { invitedUserId: userId },
        );
        return { groupId, status: 'DECLINED' };
      },
    );
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
          await this.balances.hasUnsettledBalance(transaction, groupId, userId)
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
        if (await this.balances.hasUnsettledBalance(transaction, groupId)) {
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

  // The invitee may act on an invitation only while the group is active
  // and neither party has blocked the other since it was sent.
  private async requireOwnInvitation(
    transaction: DatabaseTransaction,
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipRow> {
    const group = await this.repository.lockGroup(transaction, groupId);
    if (!group || group.status !== 'ACTIVE') {
      throw new NotFoundException('Group invitation not found.');
    }
    const invitation = await this.requirePendingInvitation(
      transaction,
      groupId,
      userId,
    );
    if (!invitation.invitedByUserId) {
      throw new ForbiddenException('Group invitation is not allowed.');
    }
    await this.requirePairAllowed(
      transaction,
      invitation.invitedByUserId,
      userId,
    );
    return invitation;
  }

  private async requirePairAllowed(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<void> {
    if (
      await this.users.isEitherUserBlocked(
        transaction,
        firstUserId,
        secondUserId,
      )
    ) {
      throw new ForbiddenException('Group invitation is not allowed.');
    }
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
      transaction,
      groupId,
      userId,
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
      transaction,
      groupId,
      userId,
    );
    if (invitation?.status !== 'INVITED') {
      throw new NotFoundException('Group invitation not found.');
    }
    return invitation;
  }

  private recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    groupId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return recordDomainChange(transaction, this.outbox, {
      actorUserId,
      aggregate: 'GROUP',
      aggregateId: groupId,
      eventType,
      ledgerId: groupId,
      payload,
    });
  }
}
