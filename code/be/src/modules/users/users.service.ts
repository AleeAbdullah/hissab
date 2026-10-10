import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DatabaseTransaction } from '../../database/database.service';
import { activityEvents } from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { type UserProfile, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findProfile(userId);
    if (!profile) {
      throw new NotFoundException('User profile not found.');
    }
    return profile;
  }

  updateProfile(
    userId: string,
    idempotencyKey: string,
    dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException('At least one profile field is required.');
    }
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'users:me:update',
      },
      async (transaction) => {
        await this.repository.updateProfile(transaction, userId, dto);
        await this.recordProfileUpdated(transaction, userId, Object.keys(dto));
        const profile = await this.repository.findProfile(userId, transaction);
        if (!profile) {
          throw new NotFoundException('User profile not found.');
        }
        return profile;
      },
    );
  }

  private async recordProfileUpdated(
    transaction: DatabaseTransaction,
    userId: string,
    changedFields: string[],
  ): Promise<void> {
    const payload = { changedFields };
    await transaction.insert(activityEvents).values({
      actorUserId: userId,
      eventType: 'USER_PROFILE_UPDATED',
      aggregateType: 'USER',
      aggregateId: userId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: 'user.profile_updated',
      aggregateType: 'user',
      aggregateId: userId,
      payload,
    });
  }
}
