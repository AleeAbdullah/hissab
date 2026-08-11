export const REALTIME_CHANNEL = 'hissab_realtime';
export const SESSION_REVOCATION_CHANNEL = 'hissab_session_revocations';

export interface SessionRevocation {
  userId: string;
  sessionId: string;
}

export interface RealtimeInvalidation {
  userIds: string[];
  area: 'EXPENSE' | 'SETTLEMENT' | 'GROUP' | 'CONNECTION' | 'REMINDER';
  eventType: string;
  aggregateId: string;
  ledgerId?: string;
  notificationId?: string;
}
