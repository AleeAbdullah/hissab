import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';

import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  financialEvents,
  groupProfiles,
  ledgerMembers,
  ledgerPostings,
  ledgers,
  userBlocks,
  users,
} from '../../database/schema';

export type GroupStatus = 'ACTIVE' | 'ARCHIVED';
export type GroupMembershipStatus =
  'INVITED' | 'ACTIVE' | 'DECLINED' | 'CANCELLED' | 'LEFT';

export type GroupMembershipRow = typeof ledgerMembers.$inferSelect;

export interface GroupView {
  id: string;
  name: string;
  status: GroupStatus;
  membershipStatus: GroupMembershipStatus;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMemberView {
  userId: string;
  displayName: string;
  email: string | null;
  status: GroupMembershipStatus;
  joinedAt: Date;
}

export interface GroupInvitationView {
  groupId: string;
  groupName: string;
  userId: string;
  userDisplayName: string;
  invitedByUserId: string;
  invitedByDisplayName: string;
  invitedAt: Date;
}

interface GroupRow {
  id: string;
  name: string;
  status: GroupStatus;
  createdAt: Date;
  updatedAt: Date;
}

type DatabaseExecutor = AppDatabase | DatabaseTransaction;

@Injectable()
export class GroupsRepository {
  constructor(private readonly database: DatabaseService) {}

  async createGroup(
    transaction: DatabaseTransaction,
    userId: string,
    name: string,
  ): Promise<GroupView> {
    const id = randomUUID();
    const now = new Date();
    await transaction.insert(ledgers).values({
      id,
      type: 'GROUP',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(groupProfiles).values({
      ledgerId: id,
      name,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(ledgerMembers).values({
      ledgerId: id,
      userId,
      status: 'ACTIVE',
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      name,
      status: 'ACTIVE',
      membershipStatus: 'ACTIVE',
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  async lockGroup(
    transaction: DatabaseTransaction,
    groupId: string,
  ): Promise<GroupRow | undefined> {
    const [group] = await transaction
      .select({
        id: ledgers.id,
        name: groupProfiles.name,
        status: ledgers.status,
        createdAt: ledgers.createdAt,
        updatedAt: ledgers.updatedAt,
      })
      .from(ledgers)
      .innerJoin(groupProfiles, eq(groupProfiles.ledgerId, ledgers.id))
      .where(and(eq(ledgers.id, groupId), eq(ledgers.type, 'GROUP')))
      .limit(1)
      .for('update', { of: ledgers });
    return group;
  }

  async findMembership(
    groupId: string,
    userId: string,
    transaction?: DatabaseTransaction,
  ): Promise<GroupMembershipRow | undefined> {
    const [membership] = await this.executor(transaction)
      .select()
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, groupId),
          eq(ledgerMembers.userId, userId),
        ),
      )
      .limit(1);
    return membership;
  }

  async isActiveUser(
    userId: string,
    transaction: DatabaseTransaction,
  ): Promise<boolean> {
    const [user] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .limit(1);
    return Boolean(user);
  }

  async isEitherUserBlocked(
    firstUserId: string,
    secondUserId: string,
    transaction: DatabaseTransaction,
  ): Promise<boolean> {
    const [block] = await transaction
      .select({ blockerUserId: userBlocks.blockerUserId })
      .from(userBlocks)
      .where(
        or(
          and(
            eq(userBlocks.blockerUserId, firstUserId),
            eq(userBlocks.blockedUserId, secondUserId),
          ),
          and(
            eq(userBlocks.blockerUserId, secondUserId),
            eq(userBlocks.blockedUserId, firstUserId),
          ),
        ),
      )
      .limit(1);
    return Boolean(block);
  }

  async updateName(
    transaction: DatabaseTransaction,
    groupId: string,
    name: string,
  ): Promise<void> {
    const now = new Date();
    await transaction
      .update(groupProfiles)
      .set({ name, updatedAt: now })
      .where(eq(groupProfiles.ledgerId, groupId));
    await transaction
      .update(ledgers)
      .set({ updatedAt: now })
      .where(eq(ledgers.id, groupId));
  }

  async saveInvitation(
    transaction: DatabaseTransaction,
    groupId: string,
    invitedUserId: string,
    invitedByUserId: string,
  ): Promise<GroupMembershipRow> {
    const now = new Date();
    const [membership] = await transaction
      .insert(ledgerMembers)
      .values({
        ledgerId: groupId,
        userId: invitedUserId,
        status: 'INVITED',
        invitedByUserId,
        invitedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [ledgerMembers.ledgerId, ledgerMembers.userId],
        set: {
          status: 'INVITED',
          invitedByUserId,
          invitedAt: now,
          updatedAt: now,
        },
      })
      .returning();
    if (!membership) {
      throw new Error('Group invitation write returned no row.');
    }
    return membership;
  }

  async transitionInvitation(
    transaction: DatabaseTransaction,
    membership: GroupMembershipRow,
    status: 'ACTIVE' | 'DECLINED' | 'CANCELLED',
  ): Promise<GroupMembershipRow> {
    const now = new Date();
    const [updated] = await transaction
      .update(ledgerMembers)
      .set({
        status,
        ...(status === 'ACTIVE'
          ? { joinedAt: membership.joinedAt ?? now }
          : {}),
        updatedAt: now,
      })
      .where(
        and(
          eq(ledgerMembers.ledgerId, membership.ledgerId),
          eq(ledgerMembers.userId, membership.userId),
          eq(ledgerMembers.status, 'INVITED'),
        ),
      )
      .returning();
    if (!updated) {
      throw new Error('Group invitation transition returned no row.');
    }
    return updated;
  }

  async hasUnsettledBalance(
    transaction: DatabaseTransaction,
    groupId: string,
    userId: string,
  ): Promise<boolean> {
    const [balance] = await transaction
      .select({ userId: ledgerPostings.userId })
      .from(ledgerPostings)
      .innerJoin(
        financialEvents,
        eq(financialEvents.id, ledgerPostings.financialEventId),
      )
      .where(
        and(
          eq(financialEvents.ledgerId, groupId),
          eq(ledgerPostings.userId, userId),
        ),
      )
      .groupBy(ledgerPostings.userId)
      .having(sql`sum(${ledgerPostings.amountMinor}) <> 0`)
      .limit(1);
    return Boolean(balance);
  }

  async groupHasUnsettledBalance(
    transaction: DatabaseTransaction,
    groupId: string,
  ): Promise<boolean> {
    const [balance] = await transaction
      .select({ userId: ledgerPostings.userId })
      .from(ledgerPostings)
      .innerJoin(
        financialEvents,
        eq(financialEvents.id, ledgerPostings.financialEventId),
      )
      .where(eq(financialEvents.ledgerId, groupId))
      .groupBy(ledgerPostings.userId)
      .having(sql`sum(${ledgerPostings.amountMinor}) <> 0`)
      .limit(1);
    return Boolean(balance);
  }

  async leaveGroup(
    transaction: DatabaseTransaction,
    groupId: string,
    userId: string,
  ): Promise<void> {
    await transaction
      .update(ledgerMembers)
      .set({ status: 'LEFT', updatedAt: new Date() })
      .where(
        and(
          eq(ledgerMembers.ledgerId, groupId),
          eq(ledgerMembers.userId, userId),
          eq(ledgerMembers.status, 'ACTIVE'),
        ),
      );
  }

  async countActiveMembers(
    transaction: DatabaseTransaction,
    groupId: string,
  ): Promise<number> {
    const result = await transaction.$count(
      ledgerMembers,
      and(
        eq(ledgerMembers.ledgerId, groupId),
        eq(ledgerMembers.status, 'ACTIVE'),
      ),
    );
    return result;
  }

  async archiveGroup(
    transaction: DatabaseTransaction,
    groupId: string,
  ): Promise<string[]> {
    const now = new Date();
    const cancelled = await transaction
      .update(ledgerMembers)
      .set({ status: 'CANCELLED', updatedAt: now })
      .where(
        and(
          eq(ledgerMembers.ledgerId, groupId),
          eq(ledgerMembers.status, 'INVITED'),
        ),
      )
      .returning({ userId: ledgerMembers.userId });
    await transaction
      .update(ledgers)
      .set({ status: 'ARCHIVED', updatedAt: now })
      .where(eq(ledgers.id, groupId));
    return cancelled.map(({ userId }) => userId);
  }

  async listGroups(userId: string): Promise<GroupView[]> {
    const result = await this.database.pool.query<GroupView>(
      `
        SELECT ledger.id,
               profile.name,
               ledger.status,
               membership.status AS "membershipStatus",
               (SELECT count(*)::integer
                FROM ledger_members active_member
                WHERE active_member.ledger_id = ledger.id
                  AND active_member.status = 'ACTIVE') AS "memberCount",
               ledger.created_at AS "createdAt",
               ledger.updated_at AS "updatedAt"
        FROM ledgers ledger
        JOIN group_profiles profile ON profile.ledger_id = ledger.id
        JOIN ledger_members membership
          ON membership.ledger_id = ledger.id
         AND membership.user_id = $1::uuid
        WHERE ledger.type = 'GROUP'
          AND membership.joined_at IS NOT NULL
        ORDER BY (ledger.status = 'ACTIVE') DESC,
                 ledger.updated_at DESC,
                 ledger.id
      `,
      [userId],
    );
    return result.rows;
  }

  async findGroup(userId: string, groupId: string): Promise<GroupView | null> {
    const result = await this.database.pool.query<GroupView>(
      `
        SELECT ledger.id,
               profile.name,
               ledger.status,
               membership.status AS "membershipStatus",
               (SELECT count(*)::integer
                FROM ledger_members active_member
                WHERE active_member.ledger_id = ledger.id
                  AND active_member.status = 'ACTIVE') AS "memberCount",
               ledger.created_at AS "createdAt",
               ledger.updated_at AS "updatedAt"
        FROM ledgers ledger
        JOIN group_profiles profile ON profile.ledger_id = ledger.id
        JOIN ledger_members membership
          ON membership.ledger_id = ledger.id
         AND membership.user_id = $1::uuid
        WHERE ledger.id = $2::uuid
          AND ledger.type = 'GROUP'
          AND membership.joined_at IS NOT NULL
        LIMIT 1
      `,
      [userId, groupId],
    );
    return result.rows[0] ?? null;
  }

  async listMembers(groupId: string): Promise<GroupMemberView[]> {
    const result = await this.database.pool.query<GroupMemberView>(
      `
        SELECT member.user_id AS "userId",
               person.display_name AS "displayName",
               person.email,
               member.status,
               member.joined_at AS "joinedAt"
        FROM ledger_members member
        JOIN users person ON person.id = member.user_id
        WHERE member.ledger_id = $1::uuid
          AND member.joined_at IS NOT NULL
        ORDER BY (member.status = 'ACTIVE') DESC,
                 person.display_name,
                 person.id
      `,
      [groupId],
    );
    return result.rows;
  }

  async listGroupInvitations(groupId: string): Promise<GroupInvitationView[]> {
    const result = await this.database.pool.query<GroupInvitationView>(
      `
        SELECT member.ledger_id AS "groupId",
               profile.name AS "groupName",
               member.user_id AS "userId",
               invited.display_name AS "userDisplayName",
               member.invited_by_user_id AS "invitedByUserId",
               inviter.display_name AS "invitedByDisplayName",
               member.invited_at AS "invitedAt"
        FROM ledger_members member
        JOIN group_profiles profile ON profile.ledger_id = member.ledger_id
        JOIN users invited ON invited.id = member.user_id
        JOIN users inviter ON inviter.id = member.invited_by_user_id
        WHERE member.ledger_id = $1::uuid
          AND member.status = 'INVITED'
        ORDER BY member.invited_at DESC, member.user_id
      `,
      [groupId],
    );
    return result.rows;
  }

  async listIncomingInvitations(
    userId: string,
  ): Promise<GroupInvitationView[]> {
    const result = await this.database.pool.query<GroupInvitationView>(
      `
        SELECT member.ledger_id AS "groupId",
               profile.name AS "groupName",
               member.user_id AS "userId",
               invited.display_name AS "userDisplayName",
               member.invited_by_user_id AS "invitedByUserId",
               inviter.display_name AS "invitedByDisplayName",
               member.invited_at AS "invitedAt"
        FROM ledger_members member
        JOIN ledgers ledger ON ledger.id = member.ledger_id
        JOIN group_profiles profile ON profile.ledger_id = member.ledger_id
        JOIN users invited ON invited.id = member.user_id
        JOIN users inviter ON inviter.id = member.invited_by_user_id
        WHERE member.user_id = $1::uuid
          AND member.status = 'INVITED'
          AND ledger.status = 'ACTIVE'
        ORDER BY member.invited_at DESC, member.ledger_id
      `,
      [userId],
    );
    return result.rows;
  }

  private executor(transaction?: DatabaseTransaction): DatabaseExecutor {
    return transaction ?? this.database.db;
  }
}
