import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DatabaseTransaction } from '../../database/database.service';
import { activityEvents } from '../../database/schema';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  type BlockView,
  type ConnectionCandidateView,
  type ConnectionRequestView,
  type ConnectionView,
  ConnectionsRepository,
  type ConnectionRequestRow,
} from './connections.repository';
import type {
  CreateConnectionRequestDto,
  FindConnectionCandidateDto,
  ListConnectionRequestsDto,
} from './dto';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly repository: ConnectionsRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  sendRequest(
    userId: string,
    idempotencyKey: string,
    dto: CreateConnectionRequestDto,
  ): Promise<ConnectionRequestRow> {
    if (userId === dto.receiverUserId) {
      throw new BadRequestException('A user cannot connect to themselves.');
    }

    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 201,
        routeScope: 'connection-requests:create',
      },
      async (transaction) => {
        if (
          !(await this.repository.isActiveUser(transaction, dto.receiverUserId))
        ) {
          throw new NotFoundException('User not found.');
        }
        await this.repository.lockPair(transaction, userId, dto.receiverUserId);
        await this.assertPairAllowed(transaction, userId, dto.receiverUserId);
        if (
          await this.repository.hasActiveDirectLedger(
            transaction,
            userId,
            dto.receiverUserId,
          )
        ) {
          throw new ConflictException('The users are already connected.');
        }
        if (
          await this.repository.hasPendingRequest(
            transaction,
            userId,
            dto.receiverUserId,
          )
        ) {
          throw new ConflictException(
            'A connection request is already pending for these users.',
          );
        }
        const request = await this.repository.createRequest(
          transaction,
          userId,
          dto.receiverUserId,
        );
        await this.recordChange(transaction, userId, request.id, 'CREATED', {
          receiverUserId: dto.receiverUserId,
        });
        return request;
      },
    );
  }

  acceptRequest(
    userId: string,
    requestId: string,
    idempotencyKey: string,
  ): Promise<{ ledgerId: string; request: ConnectionRequestRow }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { requestId },
        responseStatus: 200,
        routeScope: 'connection-requests:accept',
      },
      async (transaction) => {
        const request = await this.requirePendingRequest(
          transaction,
          requestId,
        );
        if (request.receiverUserId !== userId) {
          throw new NotFoundException('Connection request not found.');
        }
        await this.repository.lockPair(
          transaction,
          request.senderUserId,
          request.receiverUserId,
        );
        await this.assertPairAllowed(
          transaction,
          request.senderUserId,
          request.receiverUserId,
        );
        const resolved = await this.repository.resolveRequest(
          transaction,
          request.id,
          'ACCEPTED',
        );
        const ledgerId = await this.repository.createOrReactivateDirectLedger(
          transaction,
          request.senderUserId,
          request.receiverUserId,
        );
        await this.recordChange(transaction, userId, request.id, 'ACCEPTED', {
          ledgerId,
        });
        return { ledgerId, request: resolved };
      },
    );
  }

  declineRequest(
    userId: string,
    requestId: string,
    idempotencyKey: string,
  ): Promise<ConnectionRequestRow> {
    return this.resolveRequest(
      userId,
      requestId,
      idempotencyKey,
      'DECLINED',
      'receiver',
    );
  }

  cancelRequest(
    userId: string,
    requestId: string,
    idempotencyKey: string,
  ): Promise<ConnectionRequestRow> {
    return this.resolveRequest(
      userId,
      requestId,
      idempotencyKey,
      'CANCELLED',
      'sender',
    );
  }

  block(
    userId: string,
    blockedUserId: string,
    idempotencyKey: string,
  ): Promise<{ blockedUserId: string }> {
    if (userId === blockedUserId) {
      throw new BadRequestException('A user cannot block themselves.');
    }
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { blockedUserId },
        responseStatus: 200,
        routeScope: 'blocks:create',
      },
      async (transaction) => {
        await this.repository.lockPair(transaction, userId, blockedUserId);
        await this.repository.createBlock(transaction, userId, blockedUserId);
        await this.repository.cancelPendingPairRequests(
          transaction,
          userId,
          blockedUserId,
        );
        await this.repository.archiveDirectLedger(
          transaction,
          userId,
          blockedUserId,
        );
        await this.recordChange(
          transaction,
          userId,
          blockedUserId,
          'USER_BLOCKED',
          { blockedUserId },
        );
        return { blockedUserId };
      },
    );
  }

  unblock(
    userId: string,
    blockedUserId: string,
    idempotencyKey: string,
  ): Promise<{ blockedUserId: string }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { blockedUserId },
        responseStatus: 200,
        routeScope: 'blocks:delete',
      },
      async (transaction) => {
        await this.repository.lockPair(transaction, userId, blockedUserId);
        await this.repository.deleteBlock(transaction, userId, blockedUserId);
        await this.recordChange(
          transaction,
          userId,
          blockedUserId,
          'USER_UNBLOCKED',
          { blockedUserId },
        );
        return { blockedUserId };
      },
    );
  }

  listRequests(
    userId: string,
    query: ListConnectionRequestsDto,
  ): Promise<ConnectionRequestView[]> {
    return this.repository.listRequests(userId, query.direction, query.status);
  }

  findCandidate(
    userId: string,
    query: FindConnectionCandidateDto,
  ): Promise<ConnectionCandidateView | null> {
    return this.repository.findCandidate(userId, query.email);
  }

  listConnections(userId: string): Promise<ConnectionView[]> {
    return this.repository.listConnections(userId);
  }

  listBlocks(userId: string): Promise<BlockView[]> {
    return this.repository.listBlocks(userId);
  }

  private async resolveRequest(
    userId: string,
    requestId: string,
    idempotencyKey: string,
    status: 'DECLINED' | 'CANCELLED',
    permittedParty: 'receiver' | 'sender',
  ): Promise<ConnectionRequestRow> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { requestId },
        responseStatus: 200,
        routeScope: `connection-requests:${status.toLowerCase()}`,
      },
      async (transaction) => {
        const request = await this.requirePendingRequest(
          transaction,
          requestId,
        );
        const permittedUserId =
          permittedParty === 'receiver'
            ? request.receiverUserId
            : request.senderUserId;
        if (permittedUserId !== userId) {
          throw new NotFoundException('Connection request not found.');
        }
        await this.repository.lockPair(
          transaction,
          request.senderUserId,
          request.receiverUserId,
        );
        const resolved = await this.repository.resolveRequest(
          transaction,
          request.id,
          status,
        );
        await this.recordChange(transaction, userId, request.id, status, {});
        return resolved;
      },
    );
  }

  private async requirePendingRequest(
    transaction: DatabaseTransaction,
    requestId: string,
  ): Promise<ConnectionRequestRow> {
    const request = await this.repository.findRequestForUpdate(
      transaction,
      requestId,
    );
    if (!request || request.status !== 'PENDING') {
      throw new NotFoundException('Connection request not found.');
    }
    return request;
  }

  private async assertPairAllowed(
    transaction: DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<void> {
    if (
      await this.repository.isEitherUserBlocked(
        transaction,
        firstUserId,
        secondUserId,
      )
    ) {
      throw new ForbiddenException('Connection operation is not allowed.');
    }
  }

  private async recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await transaction.insert(activityEvents).values({
      actorUserId,
      eventType: `CONNECTION_${eventType}`,
      aggregateType: 'CONNECTION_REQUEST',
      aggregateId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: `connection.${eventType.toLowerCase()}`,
      aggregateType: 'connection_request',
      aggregateId,
      payload: { actorUserId, ...payload },
    });
  }
}
