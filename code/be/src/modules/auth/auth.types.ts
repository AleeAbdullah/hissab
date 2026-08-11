export interface AuthRequestMetadata {
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  displayCurrency: string;
  timezone: string;
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
  user: AuthUser;
}

export interface SessionView {
  id: string;
  current: boolean;
  deviceName: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  consumedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
}

export interface PasswordAccount extends AuthUser {
  passwordHash: string;
  status: 'ACTIVE' | 'ANONYMIZED' | 'DEACTIVATED';
}

export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromSessionId: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  consumedAt: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  createdAt: Date;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  invalidatedAt: Date | null;
}
