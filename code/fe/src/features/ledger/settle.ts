import type { LedgerBalances } from '@/api/contracts';
import type { LedgerDraft } from '@/features/ledger/draft';
import { suggestedSettlement } from '@/features/settlements/form';

// Starting values for the payment form: prefilled for a friend, the
// "which balance" picker for a group, or empty when the viewer is settled.
export function settleUpDraft(
  balances: LedgerBalances,
  draft: LedgerDraft,
  direct: boolean
): NonNullable<LedgerDraft['settlement']> {
  const own = BigInt(
    balances.members.find((member) => member.userId === draft.currentUserId)
      ?.netMinor ?? '0'
  );
  if (own === 0n) return { amount: '', fromUserId: '', toUserId: '' };
  const other = direct
    ? balances.members.find(
        (member) =>
          member.userId !== draft.currentUserId &&
          draft.members.some((active) => active.userId === member.userId) &&
          (own < 0n
            ? BigInt(member.netMinor) > 0n
            : BigInt(member.netMinor) < 0n)
      )
    : undefined;
  return {
    amount: other
      ? (suggestedSettlement(own.toString(), other.netMinor) ?? '')
      : '',
    fromUserId: own < 0n ? draft.currentUserId : (other?.userId ?? ''),
    toUserId: own > 0n ? draft.currentUserId : (other?.userId ?? '')
  };
}
