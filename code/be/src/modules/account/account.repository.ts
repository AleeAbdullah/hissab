import { Injectable } from '@nestjs/common';
import { and, eq, inArray, or, type SQL, sql } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  connectionRequests,
  deviceTokens,
  idempotencyKeys,
  notificationPreferences,
  notifications,
  passwordResetTokens,
  userBlocks,
  userIdentities,
  userPreferences,
  users,
} from '../../database/schema';
import { ACTIVITY_EVENT_TYPE_VALUES } from '../activity/dto/activity.dto';
import type {
  AccountExportDto,
  ExportActivityDto,
  ExportBlockDto,
  ExportConnectionRequestDto,
  ExportDirectLedgerDto,
  ExportEventAllocationDto,
  ExportExpensePayerDto,
  ExportExpenseRevisionDto,
  ExportExpenseSplitDto,
  ExportFinancialEventDto,
  ExportGroupDto,
  ExportGroupMemberDto,
  ExportLedgerPostingDto,
  ExportNotificationDto,
  ExportPaymentRevisionDto,
  ExportPersonalTransactionDto,
  ExportReminderDto,
} from './account.dto';

interface AccountRow {
  id: string;
  email: string | null;
  displayName: string;
  displayCurrency: string;
  timezone: string;
  status: 'ACTIVE' | 'DEACTIVATED' | 'ANONYMIZED';
  createdAt: Date;
  updatedAt: Date;
  personalReportMode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
  preferenceCreatedAt: Date;
  preferenceUpdatedAt: Date;
  pushEnabled: boolean;
  expenseActivityEnabled: boolean;
  paymentActivityEnabled: boolean;
  socialActivityEnabled: boolean;
  remindersEnabled: boolean;
  notificationPreferenceCreatedAt: Date;
  notificationPreferenceUpdatedAt: Date;
}

interface GroupRow {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
  membershipStatus: ExportGroupDto['membership']['status'];
  invitedByUserId: string | null;
  invitedAt: Date | null;
  joinedAt: Date | null;
  membershipCreatedAt: Date;
  membershipUpdatedAt: Date;
}

interface DirectLedgerRow {
  id: string;
  status: 'ACTIVE' | 'ARCHIVED';
  lowUserId: string;
  lowDisplayName: string;
  highUserId: string;
  highDisplayName: string;
  membershipStatus: 'ACTIVE' | 'LEFT' | null;
  joinedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ConnectionRow {
  id: string;
  senderUserId: string;
  senderDisplayName: string;
  receiverUserId: string;
  receiverDisplayName: string;
  status: ExportConnectionRequestDto['status'];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

interface ExpenseRow extends Omit<ExportExpenseRevisionDto, 'category'> {
  categoryCode: string;
  categoryName: string;
}

interface PersonalTransactionRow extends Omit<
  ExportPersonalTransactionDto,
  'category'
> {
  categoryCode: string;
  categoryName: string;
}

interface ActivityRow {
  id: string;
  actorUserId: string | null;
  actorDisplayName: string | null;
  ledgerId: string | null;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  createdAt: Date;
}

interface NotificationRow extends Omit<ExportNotificationDto, 'details'> {
  payload: Record<string, unknown>;
}

export interface LockedAccount {
  email: string | null;
  status: 'ACTIVE' | 'DEACTIVATED' | 'ANONYMIZED';
  passwordHash: string | null;
}

export interface AuthActorSubject {
  kind: 'refresh-token' | 'reset-token';
  subject: string;
}

const textArray = (values: readonly string[]) =>
  sql`array[${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )}]::text[]`;

@Injectable()
export class AccountRepository {
  constructor(private readonly database: DatabaseService) {}

  exportAccount(userId: string): Promise<AccountExportDto> {
    // ponytail: the v1 snapshot is held in memory; move to chunked snapshot
    // storage only when measured export sizes threaten process memory.
    return this.database.db.transaction(
      async (transaction) => {
        const generatedAtRows = await this.rows<{ generatedAt: Date }>(
          transaction,
          sql`select transaction_timestamp() as "generatedAt"`,
        );
        const accountRows = await this.rows<AccountRow>(
          transaction,
          sql`
            select person.id,
                   person.email,
                   person.display_name as "displayName",
                   person.display_currency as "displayCurrency",
                   person.timezone,
                   person.status,
                   person.created_at as "createdAt",
                   person.updated_at as "updatedAt",
                   preference.personal_report_mode as "personalReportMode",
                   preference.created_at as "preferenceCreatedAt",
                   preference.updated_at as "preferenceUpdatedAt",
                   notification_preference.push_enabled as "pushEnabled",
                   notification_preference.expense_activity_enabled as "expenseActivityEnabled",
                   notification_preference.payment_activity_enabled as "paymentActivityEnabled",
                   notification_preference.social_activity_enabled as "socialActivityEnabled",
                   notification_preference.reminders_enabled as "remindersEnabled",
                   notification_preference.created_at as "notificationPreferenceCreatedAt",
                   notification_preference.updated_at as "notificationPreferenceUpdatedAt"
            from users person
            join user_preferences preference on preference.user_id = person.id
            join notification_preferences notification_preference
              on notification_preference.user_id = person.id
            where person.id = ${userId}::uuid
              and person.status = 'ACTIVE'
          `,
        );
        const account = accountRows[0];
        const generatedAt = generatedAtRows[0]?.generatedAt;
        if (!account?.email || !generatedAt) {
          throw new Error('Active export account is missing.');
        }

        const groups = await this.exportGroups(transaction, userId);
        const directLedgers = await this.exportDirectLedgers(
          transaction,
          userId,
        );
        const connectionRequests = await this.exportConnectionRequests(
          transaction,
          userId,
        );
        const blocks = await this.exportBlocks(transaction, userId);
        const sharedFinance = await this.exportSharedFinance(
          transaction,
          userId,
        );
        const personalFinance = await this.exportPersonalFinance(
          transaction,
          userId,
        );
        const activity = await this.exportActivity(transaction, userId);
        const reminders = await this.exportReminders(transaction, userId);
        const ownedNotifications = await this.exportNotifications(
          transaction,
          userId,
        );

        return {
          schemaVersion: 1,
          generatedAt,
          profile: {
            id: account.id,
            email: account.email,
            displayName: account.displayName,
            displayCurrency: account.displayCurrency,
            timezone: account.timezone,
            status: 'ACTIVE',
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
          preferences: {
            personalReportMode: account.personalReportMode,
            createdAt: account.preferenceCreatedAt,
            updatedAt: account.preferenceUpdatedAt,
          },
          notificationPreferences: {
            pushEnabled: account.pushEnabled,
            expenseActivityEnabled: account.expenseActivityEnabled,
            settlementActivityEnabled: account.paymentActivityEnabled,
            socialActivityEnabled: account.socialActivityEnabled,
            remindersEnabled: account.remindersEnabled,
            createdAt: account.notificationPreferenceCreatedAt,
            updatedAt: account.notificationPreferenceUpdatedAt,
          },
          groups,
          directLedgers,
          connectionRequests,
          blocks,
          sharedFinance,
          personalFinance,
          activity,
          reminders,
          notifications: ownedNotifications,
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  }

  async lockAccount(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<LockedAccount | undefined> {
    const [account] = await transaction
      .select({
        email: users.email,
        status: users.status,
        passwordHash: userIdentities.passwordHash,
      })
      .from(users)
      .leftJoin(
        userIdentities,
        and(
          eq(userIdentities.userId, users.id),
          eq(userIdentities.provider, 'PASSWORD'),
        ),
      )
      .where(eq(users.id, userId))
      .limit(1)
      .for('update', { of: users });
    return account;
  }

  listAuthActorSubjects(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<AuthActorSubject[]> {
    return this.rows<AuthActorSubject>(
      transaction,
      sql`
        select 'refresh-token'::text as kind, token_hash as subject
        from refresh_sessions
        where user_id = ${userId}::uuid
        union all
        select 'reset-token'::text as kind, token_hash as subject
        from password_reset_tokens
        where user_id = ${userId}::uuid
      `,
    );
  }

  async hasNonzeroBalance(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<boolean> {
    const result = await this.rows<{ exists: boolean }>(
      transaction,
      sql`
        select exists (
          select 1
          from financial_events event
          join ledger_postings posting on posting.financial_event_id = event.id
          where posting.user_id = ${userId}::uuid
          group by event.ledger_id
          having sum(posting.amount_minor) <> 0
        ) as "exists"
      `,
    );
    return result[0]?.exists ?? false;
  }

  async lockRelevantLedgers(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<void> {
    await transaction.execute(sql`
      select ledger.id
      from ledgers ledger
      where ledger.id in (
          select membership.ledger_id
          from ledger_members membership
          where membership.user_id = ${userId}::uuid
        )
         or ${userId}::uuid in (
          ledger.direct_low_user_id,
          ledger.direct_high_user_id
        )
      order by ledger.id
      for update
    `);
    await transaction.execute(sql`
      select id
      from personal_ledgers
      where user_id = ${userId}::uuid
      for update
    `);
  }

  async hasActiveGroupMembership(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<boolean> {
    const result = await this.rows<{ exists: boolean }>(
      transaction,
      sql`
        select exists (
          select 1
          from ledger_members membership
          join ledgers ledger on ledger.id = membership.ledger_id
          where membership.user_id = ${userId}::uuid
            and membership.status = 'ACTIVE'
            and ledger.type = 'GROUP'
            and ledger.status = 'ACTIVE'
        ) as "exists"
      `,
    );
    return result[0]?.exists ?? false;
  }

  async anonymize(
    transaction: DatabaseTransaction,
    userId: string,
    idempotencyActorFingerprints: string[],
  ): Promise<Date> {
    const now = new Date();
    await transaction.execute(sql`
      update ledger_members membership
      set status = 'CANCELLED', updated_at = ${now}
      from ledgers ledger
      where ledger.id = membership.ledger_id
        and ledger.type = 'GROUP'
        and (
          membership.user_id = ${userId}::uuid
          or membership.invited_by_user_id = ${userId}::uuid
        )
        and membership.status = 'INVITED'
    `);
    await transaction.execute(sql`
      update ledger_members membership
      set status = 'LEFT', updated_at = ${now}
      from ledgers ledger
      where ledger.id = membership.ledger_id
        and ledger.type = 'GROUP'
        and ledger.status = 'ARCHIVED'
        and membership.user_id = ${userId}::uuid
        and membership.status = 'ACTIVE'
    `);
    await transaction
      .update(connectionRequests)
      .set({ status: 'CANCELLED', resolvedAt: now, updatedAt: now })
      .where(
        and(
          eq(connectionRequests.status, 'PENDING'),
          or(
            eq(connectionRequests.senderUserId, userId),
            eq(connectionRequests.receiverUserId, userId),
          ),
        ),
      );
    await transaction.execute(sql`
      update ledgers
      set status = 'ARCHIVED', updated_at = ${now}
      where type = 'DIRECT'
        and status = 'ACTIVE'
        and (${userId}::uuid in (direct_low_user_id, direct_high_user_id))
    `);
    await transaction
      .delete(userBlocks)
      .where(
        or(
          eq(userBlocks.blockerUserId, userId),
          eq(userBlocks.blockedUserId, userId),
        ),
      );
    await transaction.execute(sql`
      update refresh_sessions
      set token_hash = 'anonymized:' || id::text,
          device_id = null,
          device_name = null,
          device_platform = null,
          user_agent = null,
          ip_address = null,
          revoked_at = coalesce(revoked_at, ${now}),
          revocation_reason = 'ACCOUNT_DELETED'
      where user_id = ${userId}::uuid
    `);
    await transaction
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
    await transaction
      .delete(idempotencyKeys)
      .where(
        or(
          eq(idempotencyKeys.userId, userId),
          inArray(
            idempotencyKeys.actorFingerprint,
            idempotencyActorFingerprints,
          ),
        ),
      );
    await transaction.execute(sql`
      delete from outbox_events
      where event_type = 'auth.password_reset_requested'
        and aggregate_type = 'user'
        and aggregate_id = ${userId}::uuid
    `);
    await transaction.execute(sql`
      delete from notification_push_deliveries delivery
      where delivery.device_token_id in (
          select token.id from device_tokens token where token.user_id = ${userId}::uuid
        )
        or delivery.notification_id in (
          select notification.id
          from notifications notification
          where notification.recipient_user_id = ${userId}::uuid
             or notification.actor_user_id = ${userId}::uuid
        )
    `);
    await transaction
      .delete(deviceTokens)
      .where(eq(deviceTokens.userId, userId));
    await transaction
      .delete(notifications)
      .where(
        or(
          eq(notifications.recipientUserId, userId),
          eq(notifications.actorUserId, userId),
        ),
      );
    await transaction
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    await transaction
      .delete(userPreferences)
      .where(eq(userPreferences.userId, userId));
    await transaction
      .delete(userIdentities)
      .where(eq(userIdentities.userId, userId));
    const [deleted] = await transaction
      .update(users)
      .set({
        status: 'ANONYMIZED',
        email: null,
        displayName: 'Deleted user',
        timezone: 'UTC',
        displayCurrency: 'PKR',
        deletedAt: now,
        updatedAt: now,
      })
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .returning({ deletedAt: users.deletedAt });
    if (!deleted?.deletedAt) {
      throw new Error('Account anonymization returned no user.');
    }
    return deleted.deletedAt;
  }

  private async exportGroups(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportGroupDto[]> {
    const groups = await this.rows<GroupRow>(
      transaction,
      sql`
        select ledger.id,
               profile.name,
               ledger.status,
               ledger.created_at as "createdAt",
               ledger.updated_at as "updatedAt",
               membership.status as "membershipStatus",
               membership.invited_by_user_id as "invitedByUserId",
               membership.invited_at as "invitedAt",
               membership.joined_at as "joinedAt",
               membership.created_at as "membershipCreatedAt",
               membership.updated_at as "membershipUpdatedAt"
        from ledger_members membership
        join ledgers ledger on ledger.id = membership.ledger_id and ledger.type = 'GROUP'
        join group_profiles profile on profile.ledger_id = ledger.id
        where membership.user_id = ${userId}::uuid
        order by ledger.created_at, ledger.id
      `,
    );
    const members = await this.rows<
      ExportGroupMemberDto & { ledgerId: string }
    >(
      transaction,
      sql`
        select membership.ledger_id as "ledgerId",
               membership.user_id as "userId",
               person.display_name as "displayName",
               membership.status,
               membership.invited_by_user_id as "invitedByUserId",
               membership.invited_at as "invitedAt",
               membership.joined_at as "joinedAt",
               membership.created_at as "createdAt",
               membership.updated_at as "updatedAt"
        from ledger_members membership
        join users person on person.id = membership.user_id
        where membership.ledger_id in (
          select own_membership.ledger_id
          from ledger_members own_membership
          join ledgers ledger on ledger.id = own_membership.ledger_id
          where own_membership.user_id = ${userId}::uuid
            and ledger.type = 'GROUP'
            and own_membership.joined_at is not null
        )
          and membership.joined_at is not null
        order by membership.ledger_id, membership.created_at, membership.user_id
      `,
    );
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      status: group.status,
      membership: {
        status: group.membershipStatus,
        invitedByUserId: group.invitedByUserId,
        invitedAt: group.invitedAt,
        joinedAt: group.joinedAt,
        createdAt: group.membershipCreatedAt,
        updatedAt: group.membershipUpdatedAt,
      },
      members: members
        .filter((member) => member.ledgerId === group.id)
        .map((member) => ({
          userId: member.userId,
          displayName: member.displayName,
          status: member.status,
          invitedByUserId: member.invitedByUserId,
          invitedAt: member.invitedAt,
          joinedAt: member.joinedAt,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }));
  }

  private async exportDirectLedgers(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportDirectLedgerDto[]> {
    const rows = await this.rows<DirectLedgerRow>(
      transaction,
      sql`
        select ledger.id,
               ledger.status,
               ledger.direct_low_user_id as "lowUserId",
               low_person.display_name as "lowDisplayName",
               ledger.direct_high_user_id as "highUserId",
               high_person.display_name as "highDisplayName",
               membership.status as "membershipStatus",
               membership.joined_at as "joinedAt",
               ledger.created_at as "createdAt",
               ledger.updated_at as "updatedAt"
        from ledgers ledger
        join users low_person on low_person.id = ledger.direct_low_user_id
        join users high_person on high_person.id = ledger.direct_high_user_id
        left join ledger_members membership
          on membership.ledger_id = ledger.id and membership.user_id = ${userId}::uuid
        where ledger.type = 'DIRECT'
          and ${userId}::uuid in (ledger.direct_low_user_id, ledger.direct_high_user_id)
        order by ledger.created_at, ledger.id
      `,
    );
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      participants: [
        { userId: row.lowUserId, displayName: row.lowDisplayName },
        { userId: row.highUserId, displayName: row.highDisplayName },
      ],
      membershipStatus: row.membershipStatus,
      joinedAt: row.joinedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  private async exportConnectionRequests(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportConnectionRequestDto[]> {
    const rows = await this.rows<ConnectionRow>(
      transaction,
      sql`
        select request.id,
               request.sender_user_id as "senderUserId",
               sender.display_name as "senderDisplayName",
               request.receiver_user_id as "receiverUserId",
               receiver.display_name as "receiverDisplayName",
               request.status,
               request.created_at as "createdAt",
               request.updated_at as "updatedAt",
               request.resolved_at as "resolvedAt"
        from connection_requests request
        join users sender on sender.id = request.sender_user_id
        join users receiver on receiver.id = request.receiver_user_id
        where ${userId}::uuid in (request.sender_user_id, request.receiver_user_id)
        order by request.created_at, request.id
      `,
    );
    return rows.map((row) => ({
      id: row.id,
      direction: row.senderUserId === userId ? 'OUTGOING' : 'INCOMING',
      sender: {
        userId: row.senderUserId,
        displayName: row.senderDisplayName,
      },
      receiver: {
        userId: row.receiverUserId,
        displayName: row.receiverDisplayName,
      },
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt,
    }));
  }

  private async exportBlocks(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportBlockDto[]> {
    return this.rows<ExportBlockDto>(
      transaction,
      sql`
        select json_build_object(
                 'userId', blocked.id,
                 'displayName', blocked.display_name
               ) as "blockedUser",
               block.created_at as "createdAt"
        from user_blocks block
        join users blocked on blocked.id = block.blocked_user_id
        where block.blocker_user_id = ${userId}::uuid
        order by block.created_at, block.blocked_user_id
      `,
    );
  }

  private async exportSharedFinance(
    transaction: DatabaseTransaction,
    userId: string,
  ) {
    const ledgerScope = sql`
      select membership.ledger_id
      from ledger_members membership
      where membership.user_id = ${userId}::uuid
        and membership.joined_at is not null
    `;
    const expenseRows = await this.rows<ExpenseRow>(
      transaction,
      sql`
        select expense.id,
               expense.root_expense_id as "rootExpenseId",
               expense.replaces_expense_id as "replacesExpenseId",
               expense.ledger_id as "ledgerId",
               expense.created_by_user_id as "createdByUserId",
               expense.description,
               expense.total_minor::text as "totalMinor",
               category.code as "categoryCode",
               category.name as "categoryName",
               expense.occurred_at as "occurredAt",
               expense.status,
               expense.version,
               expense.created_at as "createdAt",
               expense.updated_at as "updatedAt"
        from expenses expense
        join categories category on category.id = expense.category_id
        where expense.ledger_id in (${ledgerScope})
        order by expense.ledger_id, expense.root_expense_id, expense.version
      `,
    );
    const expenses = expenseRows.map(
      ({ categoryCode, categoryName, ...expense }) => ({
        ...expense,
        category: { code: categoryCode, name: categoryName },
      }),
    );
    const expensePayers = await this.rows<ExportExpensePayerDto>(
      transaction,
      sql`
        select payer.expense_id as "expenseId",
               payer.user_id as "userId",
               payer.amount_minor::text as "amountMinor"
        from expense_payers payer
        join expenses expense on expense.id = payer.expense_id
        where expense.ledger_id in (${ledgerScope})
        order by payer.expense_id, payer.user_id
      `,
    );
    const expenseSplits = await this.rows<ExportExpenseSplitDto>(
      transaction,
      sql`
        select split.expense_id as "expenseId",
               split.user_id as "userId",
               split.owed_minor::text as "owedMinor",
               split.split_method as "splitMethod"
        from expense_splits split
        join expenses expense on expense.id = split.expense_id
        where expense.ledger_id in (${ledgerScope})
        order by split.expense_id, split.user_id
      `,
    );
    const payments = await this.rows<ExportPaymentRevisionDto>(
      transaction,
      sql`
        select payment.id,
               payment.root_payment_id as "rootPaymentId",
               payment.replaces_payment_id as "replacesPaymentId",
               payment.ledger_id as "ledgerId",
               payment.created_by_user_id as "createdByUserId",
               payment.from_user_id as "fromUserId",
               payment.to_user_id as "toUserId",
               payment.amount_minor::text as "amountMinor",
               payment.occurred_at as "occurredAt",
               payment.status,
               payment.version,
               payment.created_at as "createdAt",
               payment.updated_at as "updatedAt"
        from payments payment
        where payment.ledger_id in (${ledgerScope})
        order by payment.ledger_id, payment.root_payment_id, payment.version
      `,
    );
    const financialEvents = await this.rows<ExportFinancialEventDto>(
      transaction,
      sql`
        select event.id,
               event.ledger_id as "ledgerId",
               event.expense_id as "expenseId",
               event.payment_id as "paymentId",
               event.event_type as "eventType",
               event.reverses_event_id as "reversesEventId",
               event.created_by_user_id as "createdByUserId",
               event.created_at as "createdAt"
        from financial_events event
        where event.ledger_id in (${ledgerScope})
        order by event.created_at, event.id
      `,
    );
    const eventAllocations = await this.rows<ExportEventAllocationDto>(
      transaction,
      sql`
        select allocation.id,
               allocation.financial_event_id as "financialEventId",
               allocation.user_id as "userId",
               allocation.role,
               allocation.amount_minor::text as "amountMinor",
               allocation.split_method as "splitMethod"
        from event_allocations allocation
        join financial_events event on event.id = allocation.financial_event_id
        where event.ledger_id in (${ledgerScope})
        order by allocation.financial_event_id, allocation.user_id, allocation.role
      `,
    );
    const ledgerPostings = await this.rows<ExportLedgerPostingDto>(
      transaction,
      sql`
        select posting.id,
               posting.financial_event_id as "financialEventId",
               posting.user_id as "userId",
               posting.amount_minor::text as "amountMinor"
        from ledger_postings posting
        join financial_events event on event.id = posting.financial_event_id
        where event.ledger_id in (${ledgerScope})
        order by posting.financial_event_id, posting.user_id
      `,
    );
    return {
      expenses,
      expensePayers,
      expenseSplits,
      payments,
      financialEvents,
      eventAllocations,
      ledgerPostings,
    };
  }

  private async exportPersonalFinance(
    transaction: DatabaseTransaction,
    userId: string,
  ) {
    const ledgerRows = await this.rows<{ id: string; createdAt: Date }>(
      transaction,
      sql`
        select ledger.id, ledger.created_at as "createdAt"
        from personal_ledgers ledger
        where ledger.user_id = ${userId}::uuid
      `,
    );
    const ledger = ledgerRows[0];
    if (!ledger) {
      throw new Error('Personal export ledger is missing.');
    }
    const transactionRows = await this.rows<PersonalTransactionRow>(
      transaction,
      sql`
        select personal_transaction.id,
               personal_transaction.root_personal_transaction_id as "rootPersonalTransactionId",
               personal_transaction.replaces_personal_transaction_id as "replacesPersonalTransactionId",
               personal_transaction.type,
               personal_transaction.amount_minor::text as "amountMinor",
               category.code as "categoryCode",
               category.name as "categoryName",
               personal_transaction.description,
               personal_transaction.merchant_or_source as "merchantOrSource",
               personal_transaction.occurred_at as "occurredAt",
               personal_transaction.notes,
               personal_transaction.status,
               personal_transaction.version,
               personal_transaction.created_at as "createdAt",
               personal_transaction.updated_at as "updatedAt"
        from personal_transactions personal_transaction
        join categories category on category.id = personal_transaction.category_id
        where personal_transaction.personal_ledger_id = ${ledger.id}::uuid
        order by personal_transaction.root_personal_transaction_id,
                 personal_transaction.version
      `,
    );
    return {
      ledger,
      transactions: transactionRows.map(
        ({ categoryCode, categoryName, ...personalTransaction }) => ({
          ...personalTransaction,
          category: { code: categoryCode, name: categoryName },
        }),
      ),
    };
  }

  private exportActivity(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportActivityDto[]> {
    const connectionEvents = [
      'CONNECTION_CREATED',
      'CONNECTION_ACCEPTED',
      'CONNECTION_DECLINED',
      'CONNECTION_CANCELLED',
    ];
    const blockEvents = [
      'CONNECTION_USER_BLOCKED',
      'CONNECTION_USER_UNBLOCKED',
    ];
    const connectionEventArray = textArray(connectionEvents);
    const blockEventArray = textArray(blockEvents);
    const activityEventArray = textArray(ACTIVITY_EVENT_TYPE_VALUES);
    return this.rows<ActivityRow>(
      transaction,
      sql`
        select activity.id,
               activity.actor_user_id as "actorUserId",
               actor.display_name as "actorDisplayName",
               activity.ledger_id as "ledgerId",
               activity.event_type as "eventType",
               activity.aggregate_type as "aggregateType",
               activity.aggregate_id as "aggregateId",
               activity.created_at as "createdAt"
        from activity_events activity
        left join users actor on actor.id = activity.actor_user_id
        left join connection_requests request
          on request.id = activity.aggregate_id
         and activity.event_type = any(${connectionEventArray})
        where activity.event_type = any(${activityEventArray})
          and (
            (
              activity.ledger_id is not null
              and exists (
                select 1
                from ledger_members membership
                where membership.ledger_id = activity.ledger_id
                  and membership.user_id = ${userId}::uuid
                  and membership.joined_at is not null
              )
            )
            or (
              activity.event_type = any(${connectionEventArray})
              and ${userId}::uuid in (request.sender_user_id, request.receiver_user_id)
            )
            or (
              activity.event_type = any(${blockEventArray})
              and activity.actor_user_id = ${userId}::uuid
            )
          )
        order by activity.created_at, activity.id
      `,
    ).then((rows) =>
      rows.map((row) => ({
        id: row.id,
        actor:
          row.actorUserId && row.actorDisplayName
            ? {
                userId: row.actorUserId,
                displayName: row.actorDisplayName,
              }
            : null,
        ledgerId: row.ledgerId,
        eventType: row.eventType,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        createdAt: row.createdAt,
      })),
    );
  }

  private exportReminders(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportReminderDto[]> {
    return this.rows<ExportReminderDto>(
      transaction,
      sql`
        select reminder.id,
               reminder.ledger_id as "ledgerId",
               reminder.requester_user_id as "requesterUserId",
               reminder.recipient_user_id as "recipientUserId",
               reminder.owed_minor::text as "owedMinor",
               reminder.created_at as "createdAt"
        from reminder_requests reminder
        where ${userId}::uuid in (
          reminder.requester_user_id,
          reminder.recipient_user_id
        )
        order by reminder.created_at, reminder.id
      `,
    );
  }

  private exportNotifications(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<ExportNotificationDto[]> {
    return this.rows<NotificationRow>(
      transaction,
      sql`
        select notification.id,
               notification.actor_user_id as "actorUserId",
               notification.ledger_id as "ledgerId",
               notification.kind,
               notification.event_type as "eventType",
               notification.aggregate_type as "aggregateType",
               notification.aggregate_id as "aggregateId",
               notification.title,
               notification.body,
               notification.payload,
               notification.read_at as "readAt",
               notification.created_at as "createdAt"
        from notifications notification
        where notification.recipient_user_id = ${userId}::uuid
        order by notification.created_at, notification.id
      `,
    ).then((rows) =>
      rows.map(({ payload, ...notification }) => ({
        ...notification,
        details: payload,
      })),
    );
  }

  private async rows<T>(
    transaction: DatabaseTransaction,
    query: SQL,
  ): Promise<T[]> {
    return (await transaction.execute(query)).rows as unknown as T[];
  }
}
