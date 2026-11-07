import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, getTableColumns, isNull, ne, sql } from 'drizzle-orm';

import {
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '../../common/cursor';
import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  deviceTokens,
  notificationPreferences,
  notifications,
} from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import type {
  ListNotificationsDto,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';

type NotificationRow = typeof notifications.$inferSelect;
type DeviceRow = typeof deviceTokens.$inferSelect;

export interface NotificationView {
  id: string;
  actorUserId: string | null;
  ledgerId: string | null;
  kind: 'EXPENSE' | 'SETTLEMENT' | 'SOCIAL' | 'REMINDER';
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  title: string;
  body: string;
  details: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreferencesView {
  pushEnabled: boolean;
  expenseActivityEnabled: boolean;
  settlementActivityEnabled: boolean;
  socialActivityEnabled: boolean;
  remindersEnabled: boolean;
  updatedAt: Date;
}

export interface NotificationDeviceView {
  id: string;
  platform: 'IOS' | 'ANDROID';
  deviceId: string | null;
  enabled: boolean;
  lastSeenAt: Date;
  revokedAt: Date | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async getUnreadCount(userId: string): Promise<{ unreadCount: number }> {
    const [result] = await this.database.db
      .select({ unreadCount: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          isNull(notifications.readAt),
        ),
      );
    return { unreadCount: result?.unreadCount ?? 0 };
  }

  async listNotifications(
    userId: string,
    query: ListNotificationsDto,
  ): Promise<{ items: NotificationView[]; nextCursor: string | null }> {
    const limit = query.limit ?? 50;
    const cursor = query.cursor
      ? decodeTimestampCursor(query.cursor, 'notification')
      : null;
    const rows = await this.database.db
      .select({
        ...getTableColumns(notifications),
        cursorCreatedAt: sql<string>`to_char(
          ${notifications.createdAt} AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        )`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, userId),
          cursor
            ? sql`(${notifications.createdAt}, ${notifications.id})
                  < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined,
        ),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => this.toNotification(row)),
      nextCursor:
        rows.length > limit && last ? encodeTimestampCursor(last) : null,
    };
  }

  markRead(
    userId: string,
    notificationId: string,
    idempotencyKey: string,
  ): Promise<NotificationView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { notificationId },
        responseStatus: 200,
        routeScope: 'notifications:read',
        authorizeReplay: async (transaction) => {
          await this.requireOwnedNotification(
            transaction,
            userId,
            notificationId,
          );
        },
      },
      async (transaction) => {
        const notification = await this.requireOwnedNotification(
          transaction,
          userId,
          notificationId,
          true,
        );
        if (notification.readAt) {
          return this.toNotification(notification);
        }
        const [updated] = await transaction
          .update(notifications)
          .set({ readAt: new Date() })
          .where(eq(notifications.id, notificationId))
          .returning();
        if (!updated) {
          throw new Error('Notification read update returned no row.');
        }
        return this.toNotification(updated);
      },
    );
  }

  markAllRead(
    userId: string,
    idempotencyKey: string,
  ): Promise<{ updatedCount: number }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: {},
        responseStatus: 200,
        routeScope: 'notifications:read-all',
      },
      async (transaction) => {
        const updated = await transaction
          .update(notifications)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(notifications.recipientUserId, userId),
              isNull(notifications.readAt),
            ),
          )
          .returning({ id: notifications.id });
        return { updatedCount: updated.length };
      },
    );
  }

  async getPreferences(userId: string): Promise<NotificationPreferencesView> {
    const preference = await this.findPreferences(this.database.db, userId);
    if (!preference) {
      throw new NotFoundException('Notification preferences not found.');
    }
    return this.toPreferences(preference);
  }

  updatePreferences(
    userId: string,
    idempotencyKey: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesView> {
    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'At least one notification preference is required.',
      );
    }
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'notification-preferences:update',
      },
      async (transaction) => {
        const [updated] = await transaction
          .update(notificationPreferences)
          .set({
            pushEnabled: dto.pushEnabled,
            expenseActivityEnabled: dto.expenseActivityEnabled,
            paymentActivityEnabled: dto.settlementActivityEnabled,
            socialActivityEnabled: dto.socialActivityEnabled,
            remindersEnabled: dto.remindersEnabled,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, userId))
          .returning();
        if (!updated) {
          throw new NotFoundException('Notification preferences not found.');
        }
        return this.toPreferences(updated);
      },
    );
  }

  registerDevice(
    userId: string,
    idempotencyKey: string,
    dto: RegisterNotificationDeviceDto,
  ): Promise<NotificationDeviceView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 201,
        routeScope: 'notification-devices:register',
        authorizeReplay: async (transaction) => {
          await this.requireOwnedDeviceByToken(transaction, userId, dto.token);
        },
      },
      async (transaction) => {
        const now = new Date();
        if (dto.deviceId) {
          await transaction
            .update(deviceTokens)
            .set({ enabled: false, revokedAt: now, updatedAt: now })
            .where(
              and(
                eq(deviceTokens.userId, userId),
                eq(deviceTokens.deviceId, dto.deviceId),
                ne(deviceTokens.token, dto.token),
                eq(deviceTokens.enabled, true),
              ),
            );
        }
        const [device] = await transaction
          .insert(deviceTokens)
          .values({
            userId,
            token: dto.token,
            platform: dto.platform,
            deviceId: dto.deviceId,
            lastSeenAt: now,
          })
          .onConflictDoUpdate({
            target: deviceTokens.token,
            set: {
              userId,
              platform: dto.platform,
              deviceId: dto.deviceId ?? null,
              enabled: true,
              lastSeenAt: now,
              revokedAt: null,
              updatedAt: now,
            },
          })
          .returning();
        if (!device) {
          throw new Error('Notification device upsert returned no row.');
        }
        return this.toDevice(device);
      },
    );
  }

  revokeDevice(
    userId: string,
    deviceId: string,
    idempotencyKey: string,
  ): Promise<NotificationDeviceView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { deviceId },
        responseStatus: 200,
        routeScope: 'notification-devices:revoke',
        authorizeReplay: async (transaction) => {
          await this.requireOwnedDevice(transaction, userId, deviceId);
        },
      },
      async (transaction) => {
        const device = await this.requireOwnedDevice(
          transaction,
          userId,
          deviceId,
          true,
        );
        if (!device.enabled && device.revokedAt) {
          return this.toDevice(device);
        }
        const now = new Date();
        const [updated] = await transaction
          .update(deviceTokens)
          .set({ enabled: false, revokedAt: now, updatedAt: now })
          .where(eq(deviceTokens.id, deviceId))
          .returning();
        if (!updated) {
          throw new Error('Notification device revoke returned no row.');
        }
        return this.toDevice(updated);
      },
    );
  }

  private async requireOwnedNotification(
    transaction: DatabaseTransaction,
    userId: string,
    notificationId: string,
    lock = false,
  ): Promise<NotificationRow> {
    const query = transaction
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientUserId, userId),
        ),
      )
      .limit(1);
    const [notification] = lock ? await query.for('update') : await query;
    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }
    return notification;
  }

  private async requireOwnedDevice(
    transaction: DatabaseTransaction,
    userId: string,
    deviceId: string,
    lock = false,
  ): Promise<DeviceRow> {
    const query = transaction
      .select()
      .from(deviceTokens)
      .where(
        and(eq(deviceTokens.id, deviceId), eq(deviceTokens.userId, userId)),
      )
      .limit(1);
    const [device] = lock ? await query.for('update') : await query;
    if (!device) {
      throw new NotFoundException('Notification device not found.');
    }
    return device;
  }

  private async requireOwnedDeviceByToken(
    transaction: DatabaseTransaction,
    userId: string,
    token: string,
  ): Promise<void> {
    const [device] = await transaction
      .select({ id: deviceTokens.id })
      .from(deviceTokens)
      .where(
        and(eq(deviceTokens.token, token), eq(deviceTokens.userId, userId)),
      )
      .limit(1);
    if (!device) {
      throw new NotFoundException('Notification device not found.');
    }
  }

  private findPreferences(
    executor: AppDatabase | DatabaseTransaction,
    userId: string,
  ) {
    return executor.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, userId),
    });
  }

  private toNotification(row: NotificationRow): NotificationView {
    return {
      id: row.id,
      actorUserId: row.actorUserId,
      ledgerId: row.ledgerId,
      kind: row.kind,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      title: row.title,
      body: row.body,
      details: row.payload,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }

  private toPreferences(
    row: typeof notificationPreferences.$inferSelect,
  ): NotificationPreferencesView {
    return {
      pushEnabled: row.pushEnabled,
      expenseActivityEnabled: row.expenseActivityEnabled,
      settlementActivityEnabled: row.paymentActivityEnabled,
      socialActivityEnabled: row.socialActivityEnabled,
      remindersEnabled: row.remindersEnabled,
      updatedAt: row.updatedAt,
    };
  }

  private toDevice(row: DeviceRow): NotificationDeviceView {
    return {
      id: row.id,
      platform: row.platform,
      deviceId: row.deviceId,
      enabled: row.enabled,
      lastSeenAt: row.lastSeenAt,
      revokedAt: row.revokedAt,
    };
  }
}
