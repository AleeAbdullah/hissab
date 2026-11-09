// Keeps one idempotency key while a submission's outcome is unknown, so retrying
// after a lost response replays it on the server instead of recording it twice.
export function retryableSubmission(newKey: () => string) {
  let pending: { body: string; key: string } | undefined;
  return async <T>(body: unknown, send: (key: string) => Promise<T>) => {
    const serialized = JSON.stringify(body);
    if (pending?.body !== serialized)
      pending = { body: serialized, key: newKey() };
    const attempt = pending;
    try {
      const result = await send(attempt.key);
      if (pending === attempt) pending = undefined;
      return result;
    } catch (error) {
      const status = (error as { status?: unknown } | null)?.status;
      // A 4xx is a definite answer; only an unknown outcome keeps the key.
      if (typeof status === 'number' && status < 500 && pending === attempt)
        pending = undefined;
      throw error;
    }
  };
}
