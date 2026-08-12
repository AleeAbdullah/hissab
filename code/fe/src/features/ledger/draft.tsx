import { createContext, use, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { DisplayCurrency } from '@/api/contracts';

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
  startDraft: (draft: LedgerDraft) => void;
  clearDraft: () => void;
};

const LedgerDraftContext = createContext<LedgerDraftContextValue | null>(null);

export function LedgerDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<LedgerDraft | null>(null);
  const value = useMemo(
    () => ({ draft, startDraft: setDraft, clearDraft: () => setDraft(null) }),
    [draft]
  );
  return <LedgerDraftContext value={value}>{children}</LedgerDraftContext>;
}

export function useLedgerDraft() {
  const value = use(LedgerDraftContext);
  if (!value) throw new Error('Ledger draft is unavailable.');
  return value;
}
