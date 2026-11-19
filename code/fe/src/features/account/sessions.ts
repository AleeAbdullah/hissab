import type { Session } from '@/api/contracts';
import { i18n } from '@/i18n';

// The API also returns rotated, revoked and expired refresh tokens; only live ones are devices.
export const isActiveSession = (session: Session, now = Date.now()) =>
  session.current ||
  (!session.consumedAt &&
    !session.revokedAt &&
    Date.parse(session.expiresAt) > now);

// Sessions created before device names were kept on refresh only have a user agent.
export function sessionDeviceLabel(session: Session) {
  if (session.deviceName) return session.deviceName;
  const agent = session.userAgent ?? '';
  if (/CFNetwork|Darwin|iPhone|iPad/i.test(agent))
    return i18n.t('account:appleDevice');
  if (/okhttp|Android/i.test(agent)) return i18n.t('account:androidDevice');
  return i18n.t('account:unknownDevice');
}
