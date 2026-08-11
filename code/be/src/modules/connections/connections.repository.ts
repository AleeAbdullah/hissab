import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, eq, or, sql } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  connectionRequests,
  financialEvents,
  ledgerMembers,
  ledgerPostings,
  ledgers,
  userBlocks,
  users,
} from '../../database/schema';

export type ConnectionRequestRow = typeof connectionRequests.$inferSelect;

export interface ConnectionRequestView {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  direction: 'incoming' | 'outgoing';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  personUserId: string;
  personDisplayName: string;
  personEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface ConnectionCandidateView {
  userId: string;
  displayName: string;
  email: string;
  state: 'AVAILABLE' | 'CONNECTED' | 'PENDING_INCOMING' | 'PENDING_OUTGOING';
  ledgerId: string | null;
  requestId: string | null;
}

export interface ConnectionView {
  ledgerId: string;
  userId: string;
  displayName: string;
  email: string | null;
}

export interface BlockView {
  userId: string;
  displayName: string;
  email: string | null;
  createdAt: Date;
}

@Injectable()
export class ConnectionsRepository {
  constructor(private readonly database: DatabaseService) {}

  canonicalPair(firstUserId: string, secondUserId: string): [string, string] {
    return firstUserId < secondUserId
      ? [firstUserId, secondUserId]
      : [secondUserId, firstUserId];
  }

  async lockPair(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<void> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${low}:${high}`}, 0))`,
    );
  }

  async isEitherUserBlocked(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
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

  async isActiveUser(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<boolean> {
    const [user] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .limit(1);
    return Boolean(user);
  }

  async hasPendingRequest(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    const [request] = await transaction
      .select({ id: connectionRequests.id })
      .from(connectionRequests)
      .where(
        and(
          eq(connectionRequests.pairLowUserId, low),
          eq(connectionRequests.pairHighUserId, high),
          eq(connectionRequests.status, 'PENDING'),
        ),
      )
      .limit(1);
    return Boolean(request);
  }

  async hasActiveDirectLedger(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    const [ledger] = await transaction
      .select({ id: ledgers.id })
      .from(ledgers)
      .where(
        and(
          eq(ledgers.type, 'DIRECT'),
          eq(ledgers.status, 'ACTIVE'),
          eq(ledgers.directLowUserId, low),
          eq(ledgers.directHighUserId, high),
        ),
      )
      .limit(1);
    return Boolean(ledger);
  }

  async createRequest(
    transaction: DatabaseTransaction,
    senderUserId: string,
    receiverUserId: string,
  ): Promise<ConnectionRequestRow> {
    const [request] = await transaction
      .insert(connectionRequests)
      .values({
        id: randomUUID(),
        senderUserId,
        receiverUserId,
        status: 'PENDING',
      })
      .returning();

    if (!request) {
      throw new Error('Connection request insert returned no row.');
    }
    return request;
  }

  async findRequestForUpdate(
    transaction: DatabaseTransaction,
    requestId: string,
  ): Promise<ConnectionRequestRow | undefined> {
    const [request] = await transaction
      .select()
      .from(connectionRequests)
      .where(eq(connectionRequests.id, requestId))
      .limit(1)
      .for('update');
    return request;
  }

  async resolveRequest(
    transaction: DatabaseTransaction,
    requestId: string,
    status: 'ACCEPTED' | 'DECLINED' | 'CANCELLED',
  ): Promise<ConnectionRequestRow> {
    const now = new Date();
    const [request] = await transaction
      .update(connectionRequests)
      .set({ status, resolvedAt: now, updatedAt: now })
      .where(eq(connectionRequests.id, requestId))
      .returning();

    if (!request) {
      throw new Error('Connection request update returned no row.');
    }
    return request;
  }

  async createOrReactivateDirectLedger(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<string> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    const [existing] = await transaction
      .select({ id: ledgers.id })
      .from(ledgers)
      .where(
        and(
          eq(ledgers.type, 'DIRECT'),
          eq(ledgers.directLowUserId, low),
          eq(ledgers.directHighUserId, high),
        ),
      )
      .limit(1)
      .for('update');

    let ledgerId = existing?.id;
    if (ledgerId) {
      await transaction
        .update(ledgers)
        .set({ status: 'ACTIVE', updatedAt: new Date() })
        .where(eq(ledgers.id, ledgerId));
    } else {
      ledgerId = randomUUID();
      await transaction.insert(ledgers).values({
        id: ledgerId,
        type: 'DIRECT',
        status: 'ACTIVE',
        directLowUserId: low,
        directHighUserId: high,
      });
    }

    for (const userId of [low, high]) {
      const now = new Date();
      await transaction
        .insert(ledgerMembers)
        .values({
          ledgerId,
          userId,
          status: 'ACTIVE',
          joinedAt: now,
        })
        .onConflictDoUpdate({
          target: [ledgerMembers.ledgerId, ledgerMembers.userId],
          set: {
            status: 'ACTIVE',
            joinedAt: sql`coalesce(${ledgerMembers.joinedAt}, ${now})`,
            updatedAt: now,
          },
        });
    }

    return ledgerId;
  }

  async createBlock(
    transaction: DatabaseTransaction,
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<void> {
    await transaction
      .insert(userBlocks)
      .values({ blockerUserId, blockedUserId })
      .onConflictDoNothing();
  }

  async deleteBlock(
    transaction: DatabaseTransaction,
    blockerUserId: string,
    blockedUserId: string,
  ): Promise<void> {
    await transaction
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerUserId, blockerUserId),
          eq(userBlocks.blockedUserId, blockedUserId),
        ),
      );
  }

  async cancelPendingPairRequests(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<void> {
    const now = new Date();
    await transaction
      .update(connectionRequests)
      .set({ status: 'CANCELLED', resolvedAt: now, updatedAt: now })
      .where(
        and(
          eq(connectionRequests.status, 'PENDING'),
          or(
            and(
              eq(connectionRequests.senderUserId, firstUserId),
              eq(connectionRequests.receiverUserId, secondUserId),
            ),
            and(
              eq(connectionRequests.senderUserId, secondUserId),
              eq(connectionRequests.receiverUserId, firstUserId),
            ),
          ),
        ),
      );
  }

  async archiveDirectLedger(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<void> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    await transaction
      .update(ledgers)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(
        and(
          eq(ledgers.type, 'DIRECT'),
          eq(ledgers.directLowUserId, low),
          eq(ledgers.directHighUserId, high),
        ),
      );
  }

  async hasUnsettledDirectBalance(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const [low, high] = this.canonicalPair(firstUserId, secondUserId);
    const [ledger] = await transaction
      .select({ id: ledgers.id })
      .from(ledgers)
      .where(
        and(
          eq(ledgers.type, 'DIRECT'),
          eq(ledgers.directLowUserId, low),
          eq(ledgers.directHighUserId, high),
        ),
      )
      .limit(1)
      .for('update');
    if (!ledger) {
      return false;
    }
    const [balance] = await transaction
      .select({ userId: ledgerPostings.userId })
      .from(ledgerPostings)
      .innerJoin(
        financialEvents,
        eq(financialEvents.id, ledgerPostings.financialEventId),
      )
      .where(eq(financialEvents.ledgerId, ledger.id))
      .groupBy(ledgerPostings.userId)
      .having(sql`sum(${ledgerPostings.amountMinor}) <> 0`)
      .limit(1);
    return Boolean(balance);
  }

  async findCandidate(
    userId: string,
    email: string,
  ): Promise<ConnectionCandidateView | null> {
    const result = await this.database.pool.query<ConnectionCandidateView>(
      `
        SELECT candidate.id AS "userId",
               candidate.display_name AS "displayName",
               candidate.email,
               CASE
                 WHEN direct.id IS NOT NULL THEN 'CONNECTED'
                 WHEN pending.sender_user_id = $1::uuid THEN 'PENDING_OUTGOING'
                 WHEN pending.id IS NOT NULL THEN 'PENDING_INCOMING'
                 ELSE 'AVAILABLE'
               END AS state,
               direct.id AS "ledgerId",
               pending.id AS "requestId"
        FROM users candidate
        LEFT JOIN LATERAL (
          SELECT id
          FROM ledgers
          WHERE type = 'DIRECT'
            AND status = 'ACTIVE'
            AND direct_low_user_id = least($1::uuid, candidate.id)
            AND direct_high_user_id = greatest($1::uuid, candidate.id)
          LIMIT 1
        ) direct ON true
        LEFT JOIN LATERAL (
          SELECT id, sender_user_id
          FROM connection_requests
          WHERE pair_low_user_id = least($1::uuid, candidate.id)
            AND pair_high_user_id = greatest($1::uuid, candidate.id)
            AND status = 'PENDING'
          LIMIT 1
        ) pending ON true
        WHERE candidate.email = $2
          AND candidate.status = 'ACTIVE'
          AND candidate.id <> $1::uuid
          AND NOT EXISTS (
            SELECT 1
            FROM user_blocks block
            WHERE (block.blocker_user_id = $1::uuid AND block.blocked_user_id = candidate.id)
               OR (block.blocker_user_id = candidate.id AND block.blocked_user_id = $1::uuid)
          )
        LIMIT 1
      `,
      [userId, email],
    );
    return result.rows[0] ?? null;
  }

  async listRequests(
    userId: string,
    direction?: 'incoming' | 'outgoing',
    status?: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED',
  ): Promise<ConnectionRequestView[]> {
    const result = await this.database.pool.query<ConnectionRequestView>(
      `
        SELECT request.id,
               request.sender_user_id AS "senderUserId",
               request.receiver_user_id AS "receiverUserId",
               CASE WHEN request.receiver_user_id = $1::uuid THEN 'incoming' ELSE 'outgoing' END AS direction,
               request.status,
               other.id AS "personUserId",
               other.display_name AS "personDisplayName",
               other.email AS "personEmail",
               request.created_at AS "createdAt",
               request.updated_at AS "updatedAt",
               request.resolved_at AS "resolvedAt"
        FROM connection_requests request
        JOIN users other
          ON other.id = CASE
            WHEN request.receiver_user_id = $1::uuid THEN request.sender_user_id
            ELSE request.receiver_user_id
          END
        WHERE ($2::text IS NULL OR
               ($2::text = 'incoming' AND request.receiver_user_id = $1::uuid) OR
               ($2::text = 'outgoing' AND request.sender_user_id = $1::uuid))
          AND ($3::text IS NULL OR request.status::text = $3::text)
          AND (request.sender_user_id = $1::uuid OR request.receiver_user_id = $1::uuid)
        ORDER BY request.created_at DESC
      `,
      [userId, direction ?? null, status ?? null],
    );
    return result.rows;
  }

  async listConnections(userId: string): Promise<ConnectionView[]> {
    const result = await this.database.pool.query<ConnectionView>(
      `
        SELECT l.id AS "ledgerId",
               other.id AS "userId",
               other.display_name AS "displayName",
               other.email
        FROM ledgers l
        JOIN users other
          ON other.id = CASE
            WHEN l.direct_low_user_id = $1::uuid THEN l.direct_high_user_id
            ELSE l.direct_low_user_id
          END
        WHERE l.type = 'DIRECT'
          AND l.status = 'ACTIVE'
          AND (l.direct_low_user_id = $1::uuid OR l.direct_high_user_id = $1::uuid)
          AND other.status = 'ACTIVE'
        ORDER BY other.display_name, other.id
      `,
      [userId],
    );
    return result.rows;
  }

  async listBlocks(userId: string): Promise<BlockView[]> {
    const result = await this.database.pool.query<BlockView>(
      `
        SELECT blocked.id AS "userId",
               blocked.display_name AS "displayName",
               blocked.email,
               block.created_at AS "createdAt"
        FROM user_blocks block
        JOIN users blocked ON blocked.id = block.blocked_user_id
        WHERE block.blocker_user_id = $1::uuid
        ORDER BY block.created_at DESC
      `,
      [userId],
    );
    return result.rows;
  }
}
