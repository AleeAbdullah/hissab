export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  defaultCurrency: string;
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
