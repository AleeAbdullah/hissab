import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { userPreferences, users } from '../../database/schema';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  displayCurrency: string;
  timezone: string;
  personalReportMode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findProfile(
    userId: string,
    transaction?: DatabaseTransaction,
  ): Promise<UserProfile | undefined> {
    const executor: AppDatabase | DatabaseTransaction =
      transaction ?? this.database.db;
    const [profile] = await executor
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        displayCurrency: users.displayCurrency,
        timezone: users.timezone,
        personalReportMode: userPreferences.personalReportMode,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(userPreferences, eq(userPreferences.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    return profile?.email ? { ...profile, email: profile.email } : undefined;
  }

  async updateProfile(
    transaction: DatabaseTransaction,
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<void> {
    const userChanges = {
      ...(dto.displayName === undefined
        ? {}
        : { displayName: dto.displayName }),
      ...(dto.displayCurrency === undefined
        ? {}
        : { displayCurrency: dto.displayCurrency }),
      ...(dto.timezone === undefined ? {} : { timezone: dto.timezone }),
    };

    if (Object.keys(userChanges).length > 0) {
      await transaction
        .update(users)
        .set({ ...userChanges, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }
    if (dto.personalReportMode !== undefined) {
      await transaction
        .update(userPreferences)
        .set({
          personalReportMode: dto.personalReportMode,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId));
    }
  }
}
