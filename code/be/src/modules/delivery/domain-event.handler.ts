import { Injectable, OnModuleInit } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { resolveLocale, type Locale } from '../../common/locale';
import {
  renderNotificationCopy,
  type CopyKey,
  type NotificationCopy,
} from './copy';
import { DatabaseService } from '../../database/database.service';
import { notifications, users } from '../../database/schema';
import {
  type ClaimedOutboxEvent,
  type OutboxHandler,
  OutboxHandlerRegistry,
  OutboxService,
} from '../outbox';
import { REALTIME_CHANNEL, type RealtimeInvalidation } from '../realtime';

const DOMAIN_EVENT_TYPES = [
  'expense.created',
  'expense.replaced',
  'expense.deleted',
  'settlement.created',
  'settlement.replaced',
  'settlement.deleted',
  'group.created',
  'group.updated',
  'group.invitation_sent',
  'group.invitation_cancelled',
  'group.member_left',
  'group.archived',
  'group.invitation_accepted',
  'group.invitation_declined',
  'connection.created',
  'connection.accepted',
  'connection.declined',
  'connection.cancelled',
  'connection.user_blocked',
  'connection.user_unblocked',
  'reminder.created',
] as const;

type NotificationKind = 'EXPENSE' | 'SETTLEMENT' | 'SOCIAL' | 'REMINDER';

interface NotificationSpec {
  recipientUserIds: string[];
  kind: NotificationKind;
  copy: NotificationCopy;
  ledgerType?: 'DIRECT' | 'GROUP';
}

interface ConnectionPartiesRow {
  sender_user_id: string;
  receiver_user_id: string;
}

interface UserNameRow {
  display_name: string;
}

interface LedgerContextRow {
  name: string | null;
  type: 'DIRECT' | 'GROUP';
}

@Injectable()
export class DomainEventHandler implements OutboxHandler, OnModuleInit {
  readonly eventTypes = DOMAIN_EVENT_TYPES;

  constructor(
    private readonly database: DatabaseService,
    private readonly registry: OutboxHandlerRegistry,
    private readonly outbox: OutboxService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(event: ClaimedOutboxEvent): Promise<void> {
    const actorUserId = this.optionalString(event.payload.actorUserId);
    const ledgerId = this.resolveLedgerId(event);
    const area = this.area(event.eventType);
    const realtimeUserIds = await this.realtimeRecipients(
      event,
      actorUserId,
      ledgerId,
    );
    const notification = await this.notification(event, actorUserId, ledgerId);

    await this.database.transaction(async (transaction) => {
      if (notification) {
        const recipientIds = [
          ...new Set(
            notification.recipientUserIds.filter((id) => id !== actorUserId),
          ),
        ];
        const recipients = recipientIds.length
          ? await transaction
              .select({ id: users.id, locale: users.locale })
              .from(users)
              .where(
                and(
                  inArray(users.id, recipientIds),
                  eq(users.status, 'ACTIVE'),
                ),
              )
              .orderBy(users.id)
              .for('update')
          : [];
        const groups = new Map<Locale, string[]>();
        for (const recipient of recipients) {
          const locale = resolveLocale(recipient.locale);
          const ids = groups.get(locale) ?? [];
          ids.push(recipient.id);
          groups.set(locale, ids);
        }
        for (const [locale, ids] of groups) {
          const rendered = renderNotificationCopy(locale, notification.copy);
          if (!rendered) throw new Error('Invalid notification copy.');
          for (const recipientUserId of ids) {
            const [inserted] = await transaction
              .insert(notifications)
              .values({
                sourceOutboxEventId: event.id,
                recipientUserId,
                actorUserId,
                ledgerId,
                kind: notification.kind,
                eventType: event.eventType,
                aggregateType: event.aggregateType,
                aggregateId: event.aggregateId,
                title: rendered.title,
                body: rendered.body,
                payload: {
                  copy: notification.copy,
                  area,
                  eventType: event.eventType,
                  aggregateId: event.aggregateId,
                  ...(ledgerId ? { ledgerId } : {}),
                  ...(notification.ledgerType
                    ? { ledgerType: notification.ledgerType }
                    : {}),
                },
              })
              .onConflictDoNothing()
              .returning({ id: notifications.id });

            if (inserted) {
              await this.outbox.enqueue(transaction, {
                eventType: 'notification.push_requested',
                aggregateType: 'notification',
                aggregateId: inserted.id,
                payload: { notificationId: inserted.id },
              });
            }
          }
        }
      }

      const allRecipients = [
        ...new Set([
          ...realtimeUserIds,
          ...(notification?.recipientUserIds ?? []),
        ]),
      ];
      for (let offset = 0; offset < allRecipients.length; offset += 100) {
        const invalidation: RealtimeInvalidation = {
          userIds: allRecipients.slice(offset, offset + 100),
          area,
          eventType: event.eventType,
          aggregateId: event.aggregateId,
          ...(ledgerId ? { ledgerId } : {}),
        };
        await transaction.execute(
          sql`select pg_notify(${REALTIME_CHANNEL}, ${JSON.stringify(invalidation)})`,
        );
      }
    });
  }

  private async realtimeRecipients(
    event: ClaimedOutboxEvent,
    actorUserId: string | null,
    ledgerId: string | null,
  ): Promise<string[]> {
    if (event.eventType === 'reminder.created') {
      const recipientUserId = this.optionalString(
        event.payload.recipientUserId,
      );
      return recipientUserId ? [recipientUserId] : [];
    }
    if (ledgerId) {
      const members = await this.database.pool.query<{ user_id: string }>(
        `select user_id
         from ledger_members
         where ledger_id = $1::uuid and status = 'ACTIVE'`,
        [ledgerId],
      );
      const invitedUserId = this.optionalString(event.payload.invitedUserId);
      const cancelledInvitationUserIds = this.stringArray(
        event.payload.cancelledInvitationUserIds,
      );
      return [
        ...new Set([
          ...members.rows.map((row) => row.user_id),
          ...(invitedUserId ? [invitedUserId] : []),
          ...cancelledInvitationUserIds,
        ]),
      ];
    }

    if (event.eventType.startsWith('connection.user_')) {
      return actorUserId ? [actorUserId] : [];
    }
    if (event.eventType.startsWith('connection.')) {
      const parties = await this.connectionParties(event.aggregateId);
      return parties
        ? [parties.sender_user_id, parties.receiver_user_id]
        : actorUserId
          ? [actorUserId]
          : [];
    }
    return [];
  }

  private async notification(
    event: ClaimedOutboxEvent,
    actorUserId: string | null,
    ledgerId: string | null,
  ): Promise<NotificationSpec | null> {
    const actorName = actorUserId ? await this.userName(actorUserId) : null;
    const ledger = ledgerId ? await this.ledgerContext(ledgerId) : null;
    const ledgerName = ledger?.name ?? null;
    const message = (
      title: CopyKey,
      body: CopyKey,
      fallback: 'ledger' | 'group' = 'ledger',
    ): NotificationCopy => ({
      title,
      body,
      actorName,
      ledgerName,
      ledgerFallback: ledger?.type === 'DIRECT' ? 'directLedger' : fallback,
    });

    if (
      (event.eventType === 'expense.created' ||
        event.eventType === 'expense.replaced' ||
        event.eventType === 'expense.deleted') &&
      ledgerId
    ) {
      return {
        recipientUserIds: await this.activeLedgerMembers(ledgerId, actorUserId),
        kind: 'EXPENSE',
        copy: message(
          `${event.eventType}.title`,
          `${event.eventType}.${ledgerName || ledger?.type === 'DIRECT' ? 'bodyWithLedger' : 'body'}`,
        ),
        ledgerType: ledger?.type,
      };
    }
    if (
      (event.eventType === 'settlement.created' ||
        event.eventType === 'settlement.replaced' ||
        event.eventType === 'settlement.deleted') &&
      ledgerId
    ) {
      return {
        recipientUserIds: await this.activeLedgerMembers(ledgerId, actorUserId),
        kind: 'SETTLEMENT',
        copy: message(
          `${event.eventType}.title`,
          `${event.eventType}.${ledgerName || ledger?.type === 'DIRECT' ? 'bodyWithLedger' : 'body'}`,
        ),
        ledgerType: ledger?.type,
      };
    }
    if (event.eventType === 'group.invitation_sent') {
      const invitedUserId = this.optionalString(event.payload.invitedUserId);
      return invitedUserId
        ? {
            recipientUserIds: [invitedUserId],
            kind: 'SOCIAL',
            copy: message(
              'group.invitation_sent.title',
              'group.invitation_sent.body',
              'group',
            ),
            ledgerType: ledger?.type,
          }
        : null;
    }
    if (event.eventType === 'connection.created') {
      const parties = await this.connectionParties(event.aggregateId);
      return parties
        ? {
            recipientUserIds: [parties.receiver_user_id],
            kind: 'SOCIAL',
            copy: message(
              'connection.created.title',
              'connection.created.body',
            ),
          }
        : null;
    }
    if (event.eventType === 'connection.accepted') {
      const parties = await this.connectionParties(event.aggregateId);
      return parties
        ? {
            recipientUserIds: [
              parties.sender_user_id === actorUserId
                ? parties.receiver_user_id
                : parties.sender_user_id,
            ],
            kind: 'SOCIAL',
            copy: message(
              'connection.accepted.title',
              'connection.accepted.body',
            ),
          }
        : null;
    }
    if (event.eventType === 'reminder.created') {
      const recipientUserId = this.optionalString(
        event.payload.recipientUserId,
      );
      return recipientUserId
        ? {
            recipientUserIds: [recipientUserId],
            kind: 'REMINDER',
            copy: message('reminder.created.title', 'reminder.created.body'),
            ledgerType: ledger?.type,
          }
        : null;
    }
    return null;
  }

  private async activeLedgerMembers(
    ledgerId: string,
    excludedUserId: string | null,
  ): Promise<string[]> {
    const result = await this.database.pool.query<{ user_id: string }>(
      `select user_id
       from ledger_members
       where ledger_id = $1::uuid
         and status = 'ACTIVE'
         and ($2::uuid is null or user_id <> $2::uuid)`,
      [ledgerId, excludedUserId],
    );
    return result.rows.map((row) => row.user_id);
  }

  private async connectionParties(
    requestId: string,
  ): Promise<ConnectionPartiesRow | null> {
    const result = await this.database.pool.query<ConnectionPartiesRow>(
      `select sender_user_id, receiver_user_id
       from connection_requests
       where id = $1::uuid`,
      [requestId],
    );
    return result.rows[0] ?? null;
  }

  private async userName(userId: string): Promise<string | null> {
    const result = await this.database.pool.query<UserNameRow>(
      'select display_name from users where id = $1::uuid',
      [userId],
    );
    return result.rows[0]?.display_name ?? null;
  }

  private async ledgerContext(
    ledgerId: string,
  ): Promise<LedgerContextRow | null> {
    const result = await this.database.pool.query<LedgerContextRow>(
      `select case
         when ledger.type = 'GROUP' then profile.name
         else null
       end as name,
       ledger.type
       from ledgers as ledger
       left join group_profiles as profile on profile.ledger_id = ledger.id
       where ledger.id = $1::uuid`,
      [ledgerId],
    );
    return result.rows[0] ?? null;
  }

  private resolveLedgerId(event: ClaimedOutboxEvent): string | null {
    return event.eventType.startsWith('group.')
      ? event.aggregateId
      : this.optionalString(event.payload.ledgerId);
  }

  private area(eventType: string): RealtimeInvalidation['area'] {
    if (eventType.startsWith('expense.')) return 'EXPENSE';
    if (eventType.startsWith('settlement.')) return 'SETTLEMENT';
    if (eventType.startsWith('group.')) return 'GROUP';
    if (eventType.startsWith('connection.')) return 'CONNECTION';
    return 'REMINDER';
  }

  private optionalString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter(
          (item): item is string => typeof item === 'string' && item.length > 0,
        )
      : [];
  }
}
