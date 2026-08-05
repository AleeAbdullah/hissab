import { balancesListLedgerBalances, balancesListUserBalances } from '@/api/generated/sdk.gen';
import type { LedgerBalances, UserBalances } from '@/api/contracts';
import { request } from '@/api/transport';

export const userBalancesQuery = {
  queryKey: ['balances'] as const,
  queryFn: () => request<UserBalances>(() => balancesListUserBalances()),
};

export function ledgerBalancesQuery(ledgerId: string) {
  return {
    queryKey: ['ledgers', ledgerId, 'balances'] as const,
    queryFn: () => request<LedgerBalances>(() => balancesListLedgerBalances({ path: { ledgerId } })),
  };
}
