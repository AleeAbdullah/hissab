export type DisplayCurrency =
  | 'PKR'
  | 'USD'
  | 'GBP'
  | 'EUR'
  | 'AED'
  | 'SAR';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  displayCurrency: DisplayCurrency;
  timezone: string;
};

export type AuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
  user: AuthUser;
};

export type Profile = AuthUser & {
  personalReportMode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  current: boolean;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  consumedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  expenseActivityEnabled: boolean;
  settlementActivityEnabled: boolean;
  socialActivityEnabled: boolean;
  remindersEnabled: boolean;
  updatedAt: string;
};

export type InAppNotification = {
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
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: InAppNotification[];
  nextCursor: string | null;
};

export type NotificationDevice = {
  id: string;
  platform: 'IOS' | 'ANDROID';
  deviceId: string | null;
  enabled: boolean;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type AccountDeletionResult = {
  status: 'ANONYMIZED';
  deletedAt: string;
};

export type Reminder = {
  id: string;
  ledgerId: string;
  requesterUserId: string;
  recipientUserId: string;
  owedMinor: string;
  createdAt: string;
};

export type Connection = {
  ledgerId: string;
  userId: string;
  displayName: string;
  email: string | null;
};

export type ConnectionRequest = {
  id: string;
  senderUserId: string;
  receiverUserId: string;
  direction: 'incoming' | 'outgoing';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';
  personUserId: string;
  personDisplayName: string;
  personEmail: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type ConnectionCandidate = {
  userId: string;
  displayName: string;
  email: string;
  state: 'AVAILABLE' | 'CONNECTED' | 'PENDING_INCOMING' | 'PENDING_OUTGOING';
  ledgerId: string | null;
  requestId: string | null;
};

export type BlockedUser = {
  userId: string;
  displayName: string;
  email: string | null;
  createdAt: string;
};

export type GroupMembershipStatus =
  | 'INVITED'
  | 'ACTIVE'
  | 'DECLINED'
  | 'CANCELLED'
  | 'LEFT';

export type Group = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  membershipStatus: GroupMembershipStatus;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GroupMember = {
  userId: string;
  displayName: string;
  email: string | null;
  status: GroupMembershipStatus;
  joinedAt: string;
};

export type GroupUpdateResult = {
  groupId: string;
  name: string;
};

export type GroupInvitation = {
  groupId: string;
  groupName: string;
  userId: string;
  userDisplayName: string;
  invitedByUserId: string;
  invitedByDisplayName: string;
  invitedAt: string;
};

export type GroupInvitationResult = {
  groupId: string;
  userId: string;
  status: 'INVITED' | 'CANCELLED';
  invitedAt?: string;
};

export type GroupInvitationResponse = {
  groupId: string;
  status: 'ACTIVE' | 'DECLINED';
  joinedAt?: string;
};

export type GroupLeaveResult = {
  groupId: string;
  status: 'LEFT';
  groupArchived: boolean;
};

export type GroupArchiveResult = {
  groupId: string;
  status: 'ARCHIVED';
};

export type SharedExpenseCategoryCode =
  | 'FOOD_AND_DRINK'
  | 'GROCERIES'
  | 'TRANSPORT'
  | 'ACCOMMODATION'
  | 'UTILITIES'
  | 'ENTERTAINMENT'
  | 'SHOPPING'
  | 'HEALTHCARE'
  | 'OTHER';

export type SharedExpenseCategory = {
  code: SharedExpenseCategoryCode;
  name: string;
};

export type SharedExpense = {
  id: string;
  ledgerId: string;
  createdByUserId: string;
  description: string;
  totalMinor: string;
  category: SharedExpenseCategory;
  occurredAt: string;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  payers: { userId: string; amountMinor: string }[];
  participants: {
    userId: string;
    owedMinor: string;
    splitMethod: 'EQUAL' | 'EXACT';
  }[];
  createdAt: string;
};

export type SharedExpensePage = {
  items: SharedExpense[];
  nextCursor: string | null;
};

export type UserBalances = {
  totalNetMinor: string;
  ledgers: {
    ledgerId: string;
    ledgerType: 'DIRECT' | 'GROUP';
    ledgerStatus: 'ACTIVE' | 'ARCHIVED';
    netMinor: string;
  }[];
};

export type LedgerBalances = {
  ledgerId: string;
  members: {
    userId: string;
    displayName: string;
    netMinor: string;
  }[];
};

export type Settlement = {
  id: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: string;
  occurredAt: string;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: string;
};

export type SettlementPage = {
  items: Settlement[];
  nextCursor: string | null;
};

export type ActivityArea = 'EXPENSE' | 'SETTLEMENT' | 'GROUP' | 'CONNECTION';

export type ActivityUser = {
  userId: string;
  displayName: string;
};

export type ActivityLedger = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  status: 'ACTIVE' | 'ARCHIVED';
  name: string;
};

export type ActivityExpenseDetails = {
  version: number;
  totalMinor: string;
  description: string;
  category: SharedExpenseCategory;
  occurredAt: string;
};

export type ActivitySettlementDetails = {
  version: number;
  amountMinor: string;
  from: ActivityUser;
  to: ActivityUser;
  occurredAt: string;
};

export type ActivityGroupDetails = {
  name?: string;
  subjectUser?: ActivityUser;
  reason?: 'LAST_MEMBER_LEFT';
};

export type ActivityConnectionDetails = {
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'BLOCKED' | 'UNBLOCKED';
  ledgerId?: string;
};

export type ActivityItem = {
  id: string;
  area: ActivityArea;
  eventType: string;
  aggregateId: string;
  actor: ActivityUser | null;
  ledger: ActivityLedger | null;
  counterparty: ActivityUser | null;
  details: ActivityExpenseDetails | ActivitySettlementDetails | ActivityGroupDetails | ActivityConnectionDetails;
  createdAt: string;
};

export type ActivityPage = {
  items: ActivityItem[];
  nextCursor: string | null;
};

export type HomeRecentKind =
  | 'PERSONAL_INCOME'
  | 'PERSONAL_EXPENSE'
  | 'SHARED_EXPENSE'
  | 'SHARED_SETTLEMENT';

export type HomeRecentItem = {
  kind: HomeRecentKind;
  id: string;
  amountMinor: string;
  ledger: Pick<ActivityLedger, 'id' | 'type' | 'name'> | null;
  actor: ActivityUser | null;
  category: SharedExpenseCategory | null;
  description: string | null;
  from: ActivityUser | null;
  to: ActivityUser | null;
  occurredAt: string;
  createdAt: string;
};

export type Home = {
  currency: DisplayCurrency;
  personal: { monthNetMinor: string };
  shared: {
    totalNetMinor: string;
    unsettledLedgerCount: number;
    peopleCount: number;
  };
  recent: HomeRecentItem[];
};

export type PersonalTransactionType = 'INCOME' | 'EXPENSE';

export type PersonalIncomeCategoryCode =
  | 'SALARY'
  | 'FREELANCE'
  | 'BUSINESS'
  | 'GIFTS'
  | 'REFUNDS'
  | 'OTHER_INCOME';

export type PersonalCategoryCode = SharedExpenseCategoryCode | PersonalIncomeCategoryCode;

export type PersonalCategory = {
  code: PersonalCategoryCode;
  name: string;
  kind: PersonalTransactionType;
};

export type PersonalTransaction = {
  id: string;
  type: PersonalTransactionType;
  amountMinor: string;
  category: Pick<PersonalCategory, 'code' | 'name'>;
  description: string;
  merchantOrSource: string | null;
  occurredAt: string;
  notes: string | null;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: string;
};

export type PersonalTransactionPage = {
  items: PersonalTransaction[];
  nextCursor: string | null;
};

export type PersonalReportBucket = {
  period: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
};

export type PersonalReport = {
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
  buckets: PersonalReportBucket[];
  mode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
  bucket: 'DAY' | 'MONTH';
  timezone: string;
};
