import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { activityEvents } from '../../database/schema';
import { DatabaseService } from '../../database/database.service';
import { IdempotencyService } from '../idempotency';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { type UserProfile, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly repository: UsersRepository,
    private readonly idempotency: IdempotencyService,
  ) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findProfile(this.database.db, userId);
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
        await this.repository.updateProfile(transaction, userId, {
          displayName: dto.displayName,
          displayCurrency: dto.displayCurrency,
        });
        await transaction.insert(activityEvents).values({
          actorUserId: userId,
          eventType: 'USER_PROFILE_UPDATED',
          aggregateType: 'USER',
          aggregateId: userId,
          payload: { changedFields: Object.keys(dto) },
        });
        const profile = await this.repository.findProfile(transaction, userId);
        if (!profile) {
          throw new NotFoundException('User profile not found.');
        }
        return profile;
      },
    );
  }
}
