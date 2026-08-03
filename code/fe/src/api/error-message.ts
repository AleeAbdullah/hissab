const fallbackMessage = 'Something went wrong. Check your connection and try again.';

export function errorMessage(error: unknown) {
  if (typeof error === 'string' && error) return error;
  if (!error || typeof error !== 'object') return fallbackMessage;

  const record = error as Record<string, unknown>;
  const nestedError = record.error;
  const message =
    nestedError && typeof nestedError === 'object'
      ? (nestedError as Record<string, unknown>).message
      : record.message;

  if (Array.isArray(message)) return message.join('\n');
  return typeof message === 'string' && message ? message : fallbackMessage;
}
