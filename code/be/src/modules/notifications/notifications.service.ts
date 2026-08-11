import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, getTableColumns, isNull, ne, sql } from 'drizzle-orm';

import {
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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NotificationRow = typeof notifications.$inferSelect;
type DeviceRow = typeof deviceTokens.$inferSelect;

interface NotificationCursor {
  createdAt: string;
  id: string;
}

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

  async listNotifications(
    userId: string,
    query: ListNotificationsDto,
  ): Promise<{ items: NotificationView[]; nextCursor: string | null }> {
    const limit = query.limit ?? 50;
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
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
    const items = rows.slice(0, limit).map((row) => this.toNotification(row));
    return {
      items,
      nextCursor:
        rows.length > limit && rows.length > 1
          ? this.encodeCursor(rows[limit - 1])
          : null,
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
            ...(dto.pushEnabled === undefined
              ? {}
              : { pushEnabled: dto.pushEnabled }),
            ...(dto.expenseActivityEnabled === undefined
              ? {}
              : { expenseActivityEnabled: dto.expenseActivityEnabled }),
            ...(dto.settlementActivityEnabled === undefined
              ? {}
              : { paymentActivityEnabled: dto.settlementActivityEnabled }),
            ...(dto.socialActivityEnabled === undefined
              ? {}
              : { socialActivityEnabled: dto.socialActivityEnabled }),
            ...(dto.remindersEnabled === undefined
              ? {}
              : { remindersEnabled: dto.remindersEnabled }),
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
    executor: typeof this.database.db | DatabaseTransaction,
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

  private encodeCursor(notification: {
    cursorCreatedAt: string;
    id: string;
  }): string {
    return Buffer.from(
      JSON.stringify([notification.cursorCreatedAt, notification.id]),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): NotificationCursor {
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 2 ||
        typeof parsed[0] !== 'string' ||
        typeof parsed[1] !== 'string' ||
        !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(
          parsed[0],
        ) ||
        !UUID_PATTERN.test(parsed[1])
      ) {
        throw new Error('invalid cursor');
      }
      const createdAt = new Date(parsed[0]);
      const millisecondTimestamp = parsed[0].replace(/(\.\d{3})\d{3}Z$/, '$1Z');
      if (
        Number.isNaN(createdAt.getTime()) ||
        createdAt.toISOString() !== millisecondTimestamp
      ) {
        throw new Error('invalid cursor date');
      }
      return { createdAt: parsed[0], id: parsed[1].toLowerCase() };
    } catch {
      throw new BadRequestException('Invalid notification cursor.');
    }
  }
}
