import { Injectable } from '@nestjs/common';
import { and, eq, or } from 'drizzle-orm';

import type { DisplayCurrency } from '../../common/display-currency';
import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { userBlocks, users } from '../../database/schema';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  displayCurrency: DisplayCurrency;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileChanges {
  displayName?: string;
  displayCurrency?: DisplayCurrency;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findProfile(
    executor: AppDatabase | DatabaseTransaction,
    userId: string,
  ): Promise<UserProfile | undefined> {
    const [profile] = await executor
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        displayCurrency: users.displayCurrency,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return profile?.email
      ? {
          ...profile,
          email: profile.email,
          displayCurrency: profile.displayCurrency as DisplayCurrency,
        }
      : undefined;
  }

  async updateProfile(
    transaction: DatabaseTransaction,
    userId: string,
    changes: ProfileChanges,
  ): Promise<void> {
    await transaction
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async isActiveUser(
    executor: AppDatabase | DatabaseTransaction,
    userId: string,
  ): Promise<boolean> {
    const [user] = await executor
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .limit(1);
    return Boolean(user);
  }

  async isEitherUserBlocked(
    executor: AppDatabase | DatabaseTransaction,
    firstUserId: string,
    secondUserId: string,
  ): Promise<boolean> {
    const [block] = await executor
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
}
