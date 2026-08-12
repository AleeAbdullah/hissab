import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import type { PropsWithChildren } from 'react';

import { getSessionUserId } from '@/api/session-store';
import type { DisplayCurrency } from '@/api/contracts';
import { useSession } from '@/features/auth/session';
import {
  readLocalValue,
  removeLocalValue,
  writeLocalValue
} from '@/features/local-data/store';

export type LedgerDraftMember = { userId: string; displayName: string };

export type LedgerDraft = {
  ledgerId: string;
  ledgerName: string;
  members: LedgerDraftMember[];
  currentUserId: string;
  displayCurrency: DisplayCurrency;
};

type LedgerDraftContextValue = {
  draft: LedgerDraft | null;
  ready: boolean;
  startDraft: (draft: LedgerDraft) => void;
  clearDraft: () => void;
};

const LedgerDraftContext = createContext<LedgerDraftContextValue | null>(null);
const LEDGER_DRAFT_KEY = 'ledger-draft';

export function LedgerDraftProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const userId = getSessionUserId(session);
  const [draft, setDraft] = useState<LedgerDraft | null>(null);
  const [readyUserId, setReadyUserId] = useState<string | null | undefined>(
    undefined
  );
  const ready = readyUserId === userId;
  useEffect(() => {
    let active = true;
    void (async () => {
      const value = userId
        ? await readLocalValue<LedgerDraft>(userId, LEDGER_DRAFT_KEY)
        : null;
      if (!active) return;
      setDraft(value);
      setReadyUserId(userId);
    })();
    return () => {
      active = false;
    };
  }, [userId]);
  const startDraft = useCallback(
    (value: LedgerDraft) => {
      setDraft(value);
      if (userId === value.currentUserId)
        writeLocalValue(userId, LEDGER_DRAFT_KEY, value);
    },
    [userId]
  );
  const clearDraft = useCallback(() => {
    setDraft(null);
    if (userId) removeLocalValue(userId, LEDGER_DRAFT_KEY);
  }, [userId]);
  const value = useMemo(
    () => ({ draft, ready, startDraft, clearDraft }),
    [clearDraft, draft, ready, startDraft]
  );
  return <LedgerDraftContext value={value}>{children}</LedgerDraftContext>;
}

export function useLedgerDraft() {
  const value = use(LedgerDraftContext);
  if (!value) throw new Error('Ledger draft is unavailable.');
  return value;
}
