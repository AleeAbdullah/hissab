import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';

import type { EnvironmentVariables } from '../../config/environment';
import { DatabaseService } from '../../database/database.service';
import {
  type ClaimedOutboxEvent,
  type OutboxHandler,
  OutboxHandlerRegistry,
  OutboxService,
} from '../outbox';

interface NotificationRow {
  id: string;
  recipient_user_id: string;
  kind: 'EXPENSE' | 'SETTLEMENT' | 'SOCIAL' | 'REMINDER';
  event_type: string;
  aggregate_id: string;
  ledger_id: string | null;
  title: string;
  body: string;
  push_enabled: boolean;
  kind_enabled: boolean;
}

interface PushDeliveryRow {
  notification_id: string;
  device_token_id: string;
  token: string;
}

interface ReceiptDeliveryRow {
  notification_id: string;
  device_token_id: string;
  provider_ticket_id: string;
}

interface ExpoResult {
  status?: unknown;
  id?: unknown;
  message?: unknown;
  details?: { error?: unknown };
}

interface ExpoTicketResponse {
  data?: unknown;
  errors?: unknown;
}

interface ExpoReceiptResponse {
  data?: unknown;
  errors?: unknown;
}

@Injectable()
export class ExpoPushHandler implements OutboxHandler, OnModuleInit {
  readonly eventTypes = [
    'notification.push_requested',
    'notification.push_receipts_requested',
  ];

  constructor(
    private readonly database: DatabaseService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly registry: OutboxHandlerRegistry,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(event: ClaimedOutboxEvent, signal: AbortSignal): Promise<void> {
    if (!this.config.getOrThrow('EXPO_PUSH_ENABLED')) {
      return;
    }
    if (event.eventType === 'notification.push_requested') {
      await this.sendNotification(event.aggregateId, signal);
      return;
    }
    await this.checkReceipts(event.aggregateId, signal);
  }

  private async sendNotification(
    notificationId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const notification = await this.findNotification(notificationId);
    if (
      !notification ||
      !notification.push_enabled ||
      !notification.kind_enabled
    ) {
      return;
    }

    await this.database.pool.query(
      `insert into notification_push_deliveries
         (notification_id, device_token_id)
       select $1::uuid, token.id
       from device_tokens as token
       where token.user_id = $2::uuid
         and token.enabled
         and token.revoked_at is null
       on conflict do nothing`,
      [notification.id, notification.recipient_user_id],
    );
    const pending = await this.database.pool.query<PushDeliveryRow>(
      `select delivery.notification_id, delivery.device_token_id, token.token
       from notification_push_deliveries as delivery
       join device_tokens as token on token.id = delivery.device_token_id
       where delivery.notification_id = $1::uuid
         and delivery.status in ('PENDING', 'FAILED')
         and delivery.next_attempt_at <= clock_timestamp()
         and token.user_id = $2::uuid
         and token.enabled
         and token.revoked_at is null
       order by delivery.device_token_id`,
      [notification.id, notification.recipient_user_id],
    );

    let scheduledReceipt = false;
    let retryableFailure = false;
    for (let offset = 0; offset < pending.rows.length; offset += 100) {
      const deliveries = pending.rows.slice(offset, offset + 100);
      const response = await this.postJson<ExpoTicketResponse>(
        this.config.getOrThrow('EXPO_PUSH_SEND_URL'),
        deliveries.map((delivery) => ({
          to: delivery.token,
          sound: 'default',
          title: notification.title,
          body: notification.body,
          collapseId: notification.id,
          tag: notification.id,
          data: {
            notificationId: notification.id,
            deduplicationId: notification.id,
            eventType: notification.event_type,
            aggregateId: notification.aggregate_id,
            ...(notification.ledger_id
              ? { ledgerId: notification.ledger_id }
              : {}),
          },
        })),
        signal,
      );
      if (
        !Array.isArray(response.data) ||
        response.data.length !== deliveries.length
      ) {
        throw new Error('Expo returned an invalid push ticket response.');
      }

      for (const [index, delivery] of deliveries.entries()) {
        const ticket = response.data[index] as ExpoResult;
        if (ticket?.status === 'ok' && typeof ticket.id === 'string') {
          await this.markTicketed(delivery, ticket.id, !scheduledReceipt);
          scheduledReceipt = true;
          continue;
        }

        const error = this.expoError(ticket);
        await this.markFailed(delivery, error.message);
        if (error.code === 'DeviceNotRegistered') {
          await this.revokeDevice(delivery.device_token_id);
        } else if (this.isTransientExpoError(error.code)) {
          retryableFailure = true;
        }
      }
    }

    if (retryableFailure) {
      throw new Error('One or more Expo push tickets failed temporarily.');
    }
  }

  private async checkReceipts(
    notificationId: string,
    signal: AbortSignal,
  ): Promise<void> {
    const result = await this.database.pool.query<ReceiptDeliveryRow>(
      `select notification_id, device_token_id, provider_ticket_id
       from notification_push_deliveries
       where notification_id = $1::uuid and status = 'TICKETED'
       order by device_token_id`,
      [notificationId],
    );
    let missingReceipt = false;

    for (let offset = 0; offset < result.rows.length; offset += 1000) {
      const deliveries = result.rows.slice(offset, offset + 1000);
      const response = await this.postJson<ExpoReceiptResponse>(
        this.config.getOrThrow('EXPO_PUSH_RECEIPTS_URL'),
        { ids: deliveries.map((delivery) => delivery.provider_ticket_id) },
        signal,
      );
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Expo returned an invalid push receipt response.');
      }

      for (const delivery of deliveries) {
        const receipt = (response.data as Record<string, ExpoResult>)[
          delivery.provider_ticket_id
        ];
        if (!receipt) {
          missingReceipt = true;
          continue;
        }
        if (receipt.status === 'ok') {
          await this.database.pool.query(
            `update notification_push_deliveries
             set status = 'DELIVERED', receipt_checked_at = clock_timestamp(),
                 last_error = null, updated_at = clock_timestamp()
             where notification_id = $1::uuid and device_token_id = $2::uuid
               and status = 'TICKETED'`,
            [delivery.notification_id, delivery.device_token_id],
          );
          continue;
        }

        const error = this.expoError(receipt);
        if (this.isTransientExpoError(error.code)) {
          await this.retryAfterReceiptFailure(delivery, error.message);
          continue;
        }
        await this.database.pool.query(
          `update notification_push_deliveries
           set status = 'FAILED', receipt_checked_at = clock_timestamp(),
               last_error = $3, updated_at = clock_timestamp()
           where notification_id = $1::uuid and device_token_id = $2::uuid
             and status = 'TICKETED'`,
          [delivery.notification_id, delivery.device_token_id, error.message],
        );
        if (error.code === 'DeviceNotRegistered') {
          await this.revokeDevice(delivery.device_token_id);
        }
      }
    }

    if (missingReceipt) {
      throw new Error('One or more Expo push receipts are not available yet.');
    }
  }

  private async findNotification(id: string): Promise<NotificationRow | null> {
    const result = await this.database.pool.query<NotificationRow>(
      `select notification.id, notification.recipient_user_id,
              notification.kind, notification.event_type,
              notification.aggregate_id, notification.ledger_id,
              notification.title, notification.body,
              coalesce(preference.push_enabled, true) as push_enabled,
              case notification.kind
                when 'EXPENSE' then coalesce(preference.expense_activity_enabled, true)
                when 'SETTLEMENT' then coalesce(preference.payment_activity_enabled, true)
                when 'SOCIAL' then coalesce(preference.social_activity_enabled, true)
                when 'REMINDER' then coalesce(preference.reminders_enabled, true)
              end as kind_enabled
       from notifications as notification
       left join notification_preferences as preference
         on preference.user_id = notification.recipient_user_id
       where notification.id = $1::uuid`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  private async postJson<T>(
    url: string,
    body: unknown,
    signal: AbortSignal,
  ): Promise<T> {
    const accessToken = this.config.get<string>('EXPO_PUSH_ACCESS_TOKEN');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) {
      throw new Error(`Expo push request failed with HTTP ${response.status}.`);
    }
    return (await response.json()) as T;
  }

  private expoError(result: ExpoResult | undefined): {
    code: string | null;
    message: string;
  } {
    const code =
      typeof result?.details?.error === 'string' ? result.details.error : null;
    const message =
      typeof result?.message === 'string'
        ? result.message
        : (code ?? 'Unknown Expo push error.');
    return { code, message };
  }

  private markTicketed(
    delivery: PushDeliveryRow,
    providerTicketId: string,
    scheduleReceipt: boolean,
  ): Promise<void> {
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`update notification_push_deliveries
            set status = 'TICKETED', provider_ticket_id = ${providerTicketId},
                attempt_count = attempt_count + 1,
                last_attempt_at = clock_timestamp(), last_error = null,
                updated_at = clock_timestamp()
            where notification_id = ${delivery.notification_id}::uuid
              and device_token_id = ${delivery.device_token_id}::uuid`,
      );
      if (scheduleReceipt) {
        await this.outbox.enqueue(transaction, {
          eventType: 'notification.push_receipts_requested',
          aggregateType: 'notification',
          aggregateId: delivery.notification_id,
          payload: { notificationId: delivery.notification_id },
          availableAt: new Date(Date.now() + 15 * 60_000),
        });
      }
    });
  }

  private retryAfterReceiptFailure(
    delivery: ReceiptDeliveryRow,
    message: string,
  ): Promise<void> {
    const availableAt = new Date(Date.now() + 5 * 60_000);
    return this.database.transaction(async (transaction) => {
      await transaction.execute(
        sql`update notification_push_deliveries
            set status = 'FAILED', receipt_checked_at = clock_timestamp(),
                next_attempt_at = ${availableAt}, last_error = ${message},
                updated_at = clock_timestamp()
            where notification_id = ${delivery.notification_id}::uuid
              and device_token_id = ${delivery.device_token_id}::uuid
              and status = 'TICKETED'`,
      );
      await this.outbox.enqueue(transaction, {
        eventType: 'notification.push_requested',
        aggregateType: 'notification',
        aggregateId: delivery.notification_id,
        payload: { notificationId: delivery.notification_id },
        availableAt,
      });
    });
  }

  private isTransientExpoError(code: string | null): boolean {
    return code === 'MessageRateExceeded';
  }

  private markFailed(
    delivery: PushDeliveryRow,
    message: string,
  ): Promise<unknown> {
    return this.database.pool.query(
      `update notification_push_deliveries
       set status = 'FAILED', attempt_count = attempt_count + 1,
           last_attempt_at = clock_timestamp(), last_error = $3,
           updated_at = clock_timestamp()
       where notification_id = $1::uuid and device_token_id = $2::uuid`,
      [delivery.notification_id, delivery.device_token_id, message],
    );
  }

  private revokeDevice(deviceTokenId: string): Promise<unknown> {
    return this.database.pool.query(
      `update device_tokens
       set enabled = false, revoked_at = clock_timestamp(),
           updated_at = clock_timestamp()
       where id = $1::uuid`,
      [deviceTokenId],
    );
  }
}
