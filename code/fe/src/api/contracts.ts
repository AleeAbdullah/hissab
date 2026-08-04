export type SupportedCurrency =
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
  defaultCurrency: SupportedCurrency;
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
  currency: SupportedCurrency;
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
  currencies: {
    currency: SupportedCurrency;
    totalNetMinor: string;
    ledgers: {
      ledgerId: string;
      ledgerType: 'DIRECT' | 'GROUP';
      ledgerStatus: 'ACTIVE' | 'ARCHIVED';
      netMinor: string;
    }[];
  }[];
};

export type LedgerBalances = {
  ledgerId: string;
  currencies: {
    currency: SupportedCurrency;
    members: {
      userId: string;
      displayName: string;
      netMinor: string;
    }[];
  }[];
};

export type Settlement = {
  id: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: string;
  currency: SupportedCurrency;
  occurredAt: string;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: string;
};

export type SettlementPage = {
  items: Settlement[];
  nextCursor: string | null;
};
