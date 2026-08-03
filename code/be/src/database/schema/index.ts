import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  char,
  check,
  customType,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const citext = customType<{ data: string }>({
  dataType: () => 'citext',
});

const currencyCheck = (column: AnyPgColumn) =>
  sql`${column}::text ~ '^[A-Z]{3}$'`;

export const userStatusEnum = pgEnum('user_status', [
  'ACTIVE',
  'DEACTIVATED',
  'ANONYMIZED',
]);
export const identityProviderEnum = pgEnum('identity_provider', [
  'PASSWORD',
  'GOOGLE',
  'APPLE',
]);
export const connectionRequestStatusEnum = pgEnum('connection_request_status', [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
]);
export const ledgerTypeEnum = pgEnum('ledger_type', ['DIRECT', 'GROUP']);
export const ledgerStatusEnum = pgEnum('ledger_status', ['ACTIVE', 'ARCHIVED']);
export const ledgerMemberRoleEnum = pgEnum('ledger_member_role', [
  'OWNER',
  'ADMIN',
  'MEMBER',
]);
export const ledgerMemberStatusEnum = pgEnum('ledger_member_status', [
  'INVITED',
  'ACTIVE',
  'LEFT',
  'REMOVED',
]);
export const expenseStatusEnum = pgEnum('expense_status', [
  'ACTIVE',
  'DELETED',
]);
export const splitMethodEnum = pgEnum('split_method', ['EQUAL', 'EXACT']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'ACTIVE',
  'DELETED',
]);
export const financialEventTypeEnum = pgEnum('financial_event_type', [
  'CREATED',
  'REPLACEMENT',
  'REVERSAL',
]);
export const eventAllocationRoleEnum = pgEnum('event_allocation_role', [
  'PAYER',
  'PARTICIPANT',
]);
export const personalTransactionTypeEnum = pgEnum('personal_transaction_type', [
  'INCOME',
  'EXPENSE',
]);
export const personalTransactionStatusEnum = pgEnum(
  'personal_transaction_status',
  ['ACTIVE', 'DELETED'],
);
export const categoryKindEnum = pgEnum('category_kind', [
  'INCOME',
  'EXPENSE',
  'BOTH',
]);
export const personalReportModeEnum = pgEnum('personal_report_mode', [
  'OWED_SHARE',
  'CASH_OUT_OF_POCKET',
]);
export const idempotencyStatusEnum = pgEnum('idempotency_status', [
  'PROCESSING',
  'COMPLETED',
]);
export const devicePlatformEnum = pgEnum('device_platform', ['IOS', 'ANDROID']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: citext('email'),
    displayName: text('display_name').notNull(),
    defaultCurrency: char('default_currency', { length: 3 }).notNull(),
    timezone: text('timezone').notNull().default('UTC'),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_email_uq').on(table.email),
    check('users_default_currency_check', currencyCheck(table.defaultCurrency)),
    check(
      'users_email_lifecycle_check',
      sql`${table.status} = 'ANONYMIZED' OR ${table.email} IS NOT NULL`,
    ),
  ],
);

export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    provider: identityProviderEnum('provider').notNull(),
    providerSubject: text('provider_subject').notNull(),
    passwordHash: text('password_hash'),
    passwordChangedAt: timestamp('password_changed_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('user_identities_provider_subject_uq').on(
      table.provider,
      table.providerSubject,
    ),
    uniqueIndex('user_identities_user_provider_uq').on(
      table.userId,
      table.provider,
    ),
    check(
      'user_identities_password_shape_check',
      sql`(${table.provider} = 'PASSWORD' AND ${table.passwordHash} IS NOT NULL)
        OR (${table.provider} <> 'PASSWORD' AND ${table.passwordHash} IS NULL)`,
    ),
  ],
);

export const refreshSessions = pgTable(
  'refresh_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull().defaultRandom(),
    rotatedFromSessionId: uuid('rotated_from_session_id').references(
      (): AnyPgColumn => refreshSessions.id,
      { onDelete: 'restrict' },
    ),
    deviceId: text('device_id'),
    deviceName: text('device_name'),
    devicePlatform: devicePlatformEnum('device_platform'),
    userAgent: text('user_agent'),
    ipAddress: inet('ip_address'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revocationReason: text('revocation_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('refresh_sessions_token_hash_uq').on(table.tokenHash),
    uniqueIndex('refresh_sessions_rotated_from_uq').on(
      table.rotatedFromSessionId,
    ),
    index('refresh_sessions_user_idx').on(table.userId),
    index('refresh_sessions_family_idx').on(table.familyId),
    check(
      'refresh_sessions_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    tokenHash: text('token_hash').notNull(),
    requestedIp: inet('requested_ip'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('password_reset_tokens_token_hash_uq').on(table.tokenHash),
    index('password_reset_tokens_user_created_idx').on(
      table.userId,
      table.createdAt.desc(),
    ),
    check(
      'password_reset_tokens_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
  ],
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'restrict' }),
  personalReportMode: personalReportModeEnum('personal_report_mode')
    .notNull()
    .default('OWED_SHARE'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'restrict' }),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  expenseActivityEnabled: boolean('expense_activity_enabled')
    .notNull()
    .default(true),
  paymentActivityEnabled: boolean('payment_activity_enabled')
    .notNull()
    .default(true),
  remindersEnabled: boolean('reminders_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    token: text('token').notNull(),
    platform: devicePlatformEnum('platform').notNull(),
    deviceId: text('device_id'),
    enabled: boolean('enabled').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('device_tokens_token_uq').on(table.token),
    index('device_tokens_user_enabled_idx').on(table.userId, table.enabled),
  ],
);

export const connectionRequests = pgTable(
  'connection_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    senderUserId: uuid('sender_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    receiverUserId: uuid('receiver_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    pairLowUserId: uuid('pair_low_user_id')
      .notNull()
      .generatedAlwaysAs(sql`least("sender_user_id", "receiver_user_id")`),
    pairHighUserId: uuid('pair_high_user_id')
      .notNull()
      .generatedAlwaysAs(sql`greatest("sender_user_id", "receiver_user_id")`),
    status: connectionRequestStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    check(
      'connection_requests_distinct_users_check',
      sql`${table.senderUserId} <> ${table.receiverUserId}`,
    ),
    uniqueIndex('connection_requests_pending_pair_uq')
      .on(table.pairLowUserId, table.pairHighUserId)
      .where(sql`${table.status} = 'PENDING'`),
    index('connection_requests_sender_status_idx').on(
      table.senderUserId,
      table.status,
    ),
    index('connection_requests_receiver_status_idx').on(
      table.receiverUserId,
      table.status,
    ),
  ],
);

export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerUserId: uuid('blocker_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    blockedUserId: uuid('blocked_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'user_blocks_pk',
      columns: [table.blockerUserId, table.blockedUserId],
    }),
    check(
      'user_blocks_distinct_users_check',
      sql`${table.blockerUserId} <> ${table.blockedUserId}`,
    ),
    index('user_blocks_blocked_user_idx').on(table.blockedUserId),
  ],
);

export const ledgers = pgTable(
  'ledgers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: ledgerTypeEnum('type').notNull(),
    status: ledgerStatusEnum('status').notNull().default('ACTIVE'),
    directLowUserId: uuid('direct_low_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    directHighUserId: uuid('direct_high_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'ledgers_direct_shape_check',
      sql`(${table.type} = 'DIRECT'
          AND ${table.directLowUserId} IS NOT NULL
          AND ${table.directHighUserId} IS NOT NULL
          AND ${table.directLowUserId} < ${table.directHighUserId})
        OR (${table.type} = 'GROUP'
          AND ${table.directLowUserId} IS NULL
          AND ${table.directHighUserId} IS NULL)`,
    ),
    uniqueIndex('ledgers_direct_pair_uq')
      .on(table.directLowUserId, table.directHighUserId)
      .where(sql`${table.type} = 'DIRECT'`),
  ],
);

export const ledgerMembers = pgTable(
  'ledger_members',
  {
    ledgerId: uuid('ledger_id')
      .notNull()
      .references(() => ledgers.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: ledgerMemberRoleEnum('role').notNull().default('MEMBER'),
    status: ledgerMemberStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'ledger_members_pk',
      columns: [table.ledgerId, table.userId],
    }),
    index('ledger_members_user_status_idx').on(table.userId, table.status),
    index('ledger_members_ledger_status_idx').on(table.ledgerId, table.status),
  ],
);

export const groupProfiles = pgTable('group_profiles', {
  ledgerId: uuid('ledger_id')
    .primaryKey()
    .references(() => ledgers.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  groupType: text('group_type'),
  imageObjectKey: text('image_object_key'),
  simplifyDebts: boolean('simplify_debts').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    name: text('name').notNull(),
    kind: categoryKindEnum('kind').notNull(),
    iconKey: text('icon_key').notNull(),
    colorKey: text('color_key').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'categories_system_owner_check',
      sql`(${table.ownerUserId} IS NULL) = ${table.isSystem}`,
    ),
    uniqueIndex('categories_owned_name_kind_uq')
      .on(table.ownerUserId, table.name, table.kind)
      .where(sql`${table.ownerUserId} IS NOT NULL`),
    uniqueIndex('categories_system_name_kind_uq')
      .on(table.name, table.kind)
      .where(sql`${table.ownerUserId} IS NULL`),
  ],
);

export const personalLedgers = pgTable(
  'personal_ledgers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('personal_ledgers_user_uq').on(table.userId)],
);

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ledgerId: uuid('ledger_id')
      .notNull()
      .references(() => ledgers.id, { onDelete: 'restrict' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    totalMinor: bigint('total_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'restrict',
    }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: expenseStatusEnum('status').notNull().default('ACTIVE'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('expenses_positive_total_check', sql`${table.totalMinor} > 0`),
    check('expenses_currency_check', currencyCheck(table.currency)),
    check('expenses_version_check', sql`${table.version} >= 1`),
    index('expenses_ledger_active_occurred_idx')
      .on(table.ledgerId, table.occurredAt.desc(), table.id)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

export const expensePayers = pgTable(
  'expense_payers',
  {
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
  },
  (table) => [
    primaryKey({
      name: 'expense_payers_pk',
      columns: [table.expenseId, table.userId],
    }),
    check(
      'expense_payers_positive_amount_check',
      sql`${table.amountMinor} > 0`,
    ),
  ],
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    owedMinor: bigint('owed_minor', { mode: 'bigint' }).notNull(),
    splitMethod: splitMethodEnum('split_method').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'expense_splits_pk',
      columns: [table.expenseId, table.userId],
    }),
    check(
      'expense_splits_nonnegative_owed_check',
      sql`${table.owedMinor} >= 0`,
    ),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ledgerId: uuid('ledger_id')
      .notNull()
      .references(() => ledgers.id, { onDelete: 'restrict' }),
    fromUserId: uuid('from_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    toUserId: uuid('to_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    status: paymentStatusEnum('status').notNull().default('ACTIVE'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'payments_distinct_parties_check',
      sql`${table.fromUserId} <> ${table.toUserId}`,
    ),
    check('payments_positive_amount_check', sql`${table.amountMinor} > 0`),
    check('payments_currency_check', currencyCheck(table.currency)),
    check('payments_version_check', sql`${table.version} >= 1`),
    index('payments_ledger_occurred_idx').on(
      table.ledgerId,
      table.occurredAt.desc(),
      table.id,
    ),
  ],
);

export const personalTransactions = pgTable(
  'personal_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    personalLedgerId: uuid('personal_ledger_id')
      .notNull()
      .references(() => personalLedgers.id, { onDelete: 'restrict' }),
    type: personalTransactionTypeEnum('type').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    merchantOrSource: text('merchant_or_source'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    notes: text('notes'),
    status: personalTransactionStatusEnum('status').notNull().default('ACTIVE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'personal_transactions_positive_amount_check',
      sql`${table.amountMinor} > 0`,
    ),
    check(
      'personal_transactions_currency_check',
      currencyCheck(table.currency),
    ),
    index('personal_transactions_ledger_active_occurred_idx')
      .on(table.personalLedgerId, table.occurredAt.desc(), table.id)
      .where(sql`${table.status} = 'ACTIVE'`),
  ],
);

export const financialEvents = pgTable(
  'financial_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ledgerId: uuid('ledger_id')
      .notNull()
      .references(() => ledgers.id, { onDelete: 'restrict' }),
    expenseId: uuid('expense_id').references(() => expenses.id, {
      onDelete: 'restrict',
    }),
    paymentId: uuid('payment_id').references(() => payments.id, {
      onDelete: 'restrict',
    }),
    eventType: financialEventTypeEnum('event_type').notNull(),
    reversesEventId: uuid('reverses_event_id').references(
      (): AnyPgColumn => financialEvents.id,
      { onDelete: 'restrict' },
    ),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'financial_events_one_source_check',
      sql`num_nonnulls(${table.expenseId}, ${table.paymentId}) = 1`,
    ),
    check(
      'financial_events_reversal_shape_check',
      sql`(${table.eventType} = 'REVERSAL') = (${table.reversesEventId} IS NOT NULL)`,
    ),
    check(
      'financial_events_no_self_reversal_check',
      sql`${table.reversesEventId} IS NULL OR ${table.reversesEventId} <> ${table.id}`,
    ),
    uniqueIndex('financial_events_reverses_event_uq')
      .on(table.reversesEventId)
      .where(sql`${table.reversesEventId} IS NOT NULL`),
    uniqueIndex('financial_events_expense_created_uq')
      .on(table.expenseId)
      .where(
        sql`${table.expenseId} IS NOT NULL AND ${table.eventType} = 'CREATED'`,
      ),
    uniqueIndex('financial_events_payment_created_uq')
      .on(table.paymentId)
      .where(
        sql`${table.paymentId} IS NOT NULL AND ${table.eventType} = 'CREATED'`,
      ),
    index('financial_events_ledger_order_idx').on(
      table.ledgerId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const eventAllocations = pgTable(
  'event_allocations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    financialEventId: uuid('financial_event_id')
      .notNull()
      .references(() => financialEvents.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: eventAllocationRoleEnum('role').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    splitMethod: splitMethodEnum('split_method'),
  },
  (table) => [
    uniqueIndex('event_allocations_event_user_role_uq').on(
      table.financialEventId,
      table.userId,
      table.role,
    ),
    check(
      'event_allocations_role_shape_check',
      sql`(${table.role} = 'PAYER'
          AND ${table.amountMinor} > 0
          AND ${table.splitMethod} IS NULL)
        OR (${table.role} = 'PARTICIPANT'
          AND ${table.amountMinor} >= 0
          AND ${table.splitMethod} IS NOT NULL)`,
    ),
  ],
);

export const ledgerPostings = pgTable(
  'ledger_postings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    financialEventId: uuid('financial_event_id')
      .notNull()
      .references(() => financialEvents.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    amountMinor: bigint('amount_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex('ledger_postings_event_user_uq').on(
      table.financialEventId,
      table.userId,
    ),
    check('ledger_postings_currency_check', currencyCheck(table.currency)),
    index('ledger_postings_user_idx').on(table.userId),
  ],
);

export const balanceProjections = pgTable(
  'balance_projections',
  {
    ledgerId: uuid('ledger_id')
      .notNull()
      .references(() => ledgers.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    currency: char('currency', { length: 3 }).notNull(),
    netMinor: bigint('net_minor', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    lastFinancialEventId: uuid('last_financial_event_id')
      .notNull()
      .references(() => financialEvents.id, { onDelete: 'restrict' }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: 'balance_projections_pk',
      columns: [table.ledgerId, table.userId, table.currency],
    }),
    check('balance_projections_currency_check', currencyCheck(table.currency)),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    expenseId: uuid('expense_id').references(() => expenses.id, {
      onDelete: 'restrict',
    }),
    personalTransactionId: uuid('personal_transaction_id').references(
      () => personalTransactions.id,
      { onDelete: 'restrict' },
    ),
    objectKey: text('object_key').notNull(),
    contentType: text('content_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'bigint' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'attachments_one_parent_check',
      sql`num_nonnulls(${table.expenseId}, ${table.personalTransactionId}) = 1`,
    ),
    check('attachments_nonnegative_size_check', sql`${table.sizeBytes} >= 0`),
    uniqueIndex('attachments_object_key_uq').on(table.objectKey),
    index('attachments_expense_idx')
      .on(table.expenseId)
      .where(sql`${table.expenseId} IS NOT NULL`),
    index('attachments_personal_transaction_idx')
      .on(table.personalTransactionId)
      .where(sql`${table.personalTransactionId} IS NOT NULL`),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: text('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    availableAt: timestamp('available_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    attemptCount: integer('attempt_count').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(10),
    claimToken: uuid('claim_token'),
    claimedBy: text('claimed_by'),
    leaseExpiresAt: timestamp('lease_expires_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    deadLetteredAt: timestamp('dead_lettered_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'outbox_events_attempts_check',
      sql`${table.attemptCount} >= 0 AND ${table.maxAttempts} > 0`,
    ),
    check(
      'outbox_events_claim_shape_check',
      sql`num_nonnulls(${table.claimToken}, ${table.claimedBy}, ${table.leaseExpiresAt}) IN (0, 3)`,
    ),
    check(
      'outbox_events_terminal_state_check',
      sql`num_nonnulls(${table.processedAt}, ${table.deadLetteredAt}) <= 1`,
    ),
    index('outbox_events_pending_idx')
      .on(table.availableAt, table.leaseExpiresAt, table.id)
      .where(
        sql`${table.processedAt} IS NULL AND ${table.deadLetteredAt} IS NULL`,
      ),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    actorFingerprint: text('actor_fingerprint').notNull(),
    routeScope: text('route_scope').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    requestHash: text('request_hash').notNull(),
    status: idempotencyStatusEnum('status').notNull().default('PROCESSING'),
    lockToken: uuid('lock_token'),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    responseStatus: integer('response_status'),
    responseBody: jsonb('response_body').$type<unknown>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idempotency_keys_actor_scope_key_uq').on(
      table.actorFingerprint,
      table.routeScope,
      table.idempotencyKey,
    ),
    uniqueIndex('idempotency_keys_user_scope_key_uq')
      .on(table.userId, table.routeScope, table.idempotencyKey)
      .where(sql`${table.userId} IS NOT NULL`),
    check(
      'idempotency_keys_state_shape_check',
      sql`(${table.status} = 'PROCESSING'
          AND ${table.lockToken} IS NOT NULL
          AND ${table.lockedUntil} IS NOT NULL
          AND ${table.responseStatus} IS NULL)
        OR (${table.status} = 'COMPLETED'
          AND ${table.lockToken} IS NULL
          AND ${table.lockedUntil} IS NULL
          AND ${table.responseStatus} BETWEEN 100 AND 599)`,
    ),
    check(
      'idempotency_keys_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    index('idempotency_keys_expiry_idx').on(table.expiresAt),
  ],
);

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    ledgerId: uuid('ledger_id').references(() => ledgers.id, {
      onDelete: 'restrict',
    }),
    eventType: text('event_type').notNull(),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('activity_events_ledger_created_idx').on(
      table.ledgerId,
      table.createdAt.desc(),
      table.id,
    ),
    index('activity_events_actor_created_idx').on(
      table.actorUserId,
      table.createdAt.desc(),
    ),
  ],
);
