import type { LedgerBalances } from '@/api/contracts';

export type SimplifiedPayment = {
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  amountMinor: string;
};

export function simplifyLedgerBalances(
  members: LedgerBalances['members']
): SimplifiedPayment[] | null {
  if (
    members.reduce((total, member) => total + BigInt(member.netMinor), 0n) !==
    0n
  )
    return null;

  const byLargestBalanceThenId = (
    left: { userId: string; remaining: bigint },
    right: { userId: string; remaining: bigint }
  ) =>
    left.remaining === right.remaining
      ? left.userId.localeCompare(right.userId)
      : left.remaining > right.remaining
        ? -1
        : 1;
  const debtors = members
    .filter((member) => BigInt(member.netMinor) < 0n)
    .map((member) => ({ ...member, remaining: -BigInt(member.netMinor) }))
    .sort(byLargestBalanceThenId);
  const creditors = members
    .filter((member) => BigInt(member.netMinor) > 0n)
    .map((member) => ({ ...member, remaining: BigInt(member.netMinor) }))
    .sort(byLargestBalanceThenId);
  const payments: SimplifiedPayment[] = [];

  for (let debtorIndex = 0, creditorIndex = 0; debtorIndex < debtors.length;) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount =
      debtor.remaining < creditor.remaining
        ? debtor.remaining
        : creditor.remaining;

    payments.push({
      fromUserId: debtor.userId,
      fromDisplayName: debtor.displayName,
      toUserId: creditor.userId,
      toDisplayName: creditor.displayName,
      amountMinor: amount.toString()
    });
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0n) debtorIndex += 1;
    if (creditor.remaining === 0n) creditorIndex += 1;
  }

  return payments;
}
