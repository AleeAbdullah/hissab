import { useCallback, useEffect, useRef, useState } from 'react';

import { getSessionUserId, getTokens } from '@/api/session-store';
import { useSession } from '@/features/auth/session';
import {
  readLocalValue,
  removeLocalValue,
  writeLocalValue
} from '@/features/local-data/store';

export function usePersistentDraft<T>(key: string | null) {
  const session = useSession();
  const userId = getSessionUserId(session);
  const [draft, setDraft] = useState<T | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null | undefined>(
    undefined
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<T | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (
      userId &&
      key &&
      latest.current !== null &&
      getSessionUserId(getTokens()) === userId
    )
      writeLocalValue(userId, key, latest.current);
  }, [key, userId]);

  useEffect(() => {
    let active = true;
    latest.current = null;
    void (async () => {
      const value = userId && key ? await readLocalValue<T>(userId, key) : null;
      if (!active) return;
      setDraft(value);
      setLoadedKey(key);
    })();
    return () => {
      active = false;
      flush();
    };
  }, [flush, key, userId]);

  const save = useCallback(
    (value: T | null) => {
      latest.current = value;
      if (!userId || !key) return;
      if (timer.current) clearTimeout(timer.current);
      if (value === null) {
        removeLocalValue(userId, key);
        return;
      }
      timer.current = setTimeout(
        () => writeLocalValue(userId, key, value),
        400
      );
    },
    [key, userId]
  );

  const clear = useCallback(() => save(null), [save]);

  return { clear, draft, ready: loadedKey === key, save };
}
