import { i18n } from '@/i18n';

const knownErrors = {
  'Minor-unit amount exceeds 64-bit range.': 'amountTooLarge',
  'A group invitation is already pending for this user.': 'invitationPending',
  'All payers and participants must be active ledger members.':
    'inactiveMembers',
  'Settlement parties must be active ledger members.': 'inactiveMembers',
  'Email or password is incorrect.': 'invalidCredentials',
  'Current password is incorrect.': 'incorrectPassword',
  'An account with this email already exists.': 'emailExists',
  'Password reset token is invalid or expired.': 'resetExpired',
  'Expense version conflict.': 'versionConflict',
  'Settlement version conflict.': 'versionConflict',
  'Personal transaction version conflict.': 'versionConflict',
  'Archived groups are read-only.': 'archived',
  'Archived ledgers are read-only.': 'archived',
  'Deleted expenses cannot be changed.': 'deleted',
  'Deleted settlements cannot be changed.': 'deleted',
  'Deleted personal transactions cannot be changed.': 'deleted',
  'Settle all group balances before archiving.': 'settleBalances',
  'Settle all group balances before leaving.': 'settleBalances',
  'Settle every ledger balance before deleting your account.': 'settleBalances',
  'The connection cannot be blocked until all balances are settled.':
    'settleBalances',
  'Leave every active group before deleting your account.': 'leaveGroups'
} as const;

const errorCodes = {
  REMINDER_COOLDOWN: 'reminderCooldown',
  Unauthorized: 'sessionExpired',
  HTTP_401: 'sessionExpired',
  Forbidden: 'notAllowed',
  HTTP_403: 'notAllowed',
  'Not Found': 'notFound',
  HTTP_404: 'notFound',
  Conflict: 'conflict',
  HTTP_409: 'conflict',
  'Bad Request': 'invalidInput',
  HTTP_400: 'invalidInput',
  'Too Many Requests': 'rateLimited',
  HTTP_429: 'rateLimited'
} as const;

export function errorMessage(error: unknown) {
  if (typeof error === 'string' && error) return localizedMessage(error);
  if (!error || typeof error !== 'object')
    return i18n.t('common:requestFailed');

  const record = error as Record<string, unknown>;
  const nestedError = record.error;
  const body =
    nestedError && typeof nestedError === 'object'
      ? (nestedError as Record<string, unknown>)
      : record;
  const message = body.message;

  const key =
    typeof body.code === 'string' && Object.hasOwn(errorCodes, body.code)
      ? errorCodes[body.code as keyof typeof errorCodes]
      : undefined;
  if (Array.isArray(message))
    return i18n.language === 'en'
      ? message.join('\n')
      : i18n.t('common:apiErrors.invalidInput');
  return typeof message === 'string' && message
    ? localizedMessage(message, key)
    : i18n.t('common:requestFailed');
}

function localizedMessage(
  message: string,
  fallback?: (typeof errorCodes)[keyof typeof errorCodes]
) {
  const key = Object.hasOwn(knownErrors, message)
    ? knownErrors[message as keyof typeof knownErrors]
    : undefined;
  if (key) return i18n.t(`common:apiErrors.${key}`);
  if (i18n.language === 'en') return message;
  return fallback
    ? i18n.t(`common:apiErrors.${fallback}`)
    : i18n.t('common:requestFailed');
}
