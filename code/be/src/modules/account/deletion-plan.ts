import { createHash } from 'node:crypto';

import type {
  DeletionBalanceRow,
  DeletionGroupRow,
} from './account.repository';

export interface PlannedSettlement {
  ledgerId: string;
  ledgerType: 'DIRECT' | 'GROUP';
  groupName: string | null;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  amountMinor: string;
}

export interface PlannedGroupLeave {
  groupId: string;
  name: string;
  willArchive: boolean;
}

export interface DeletionPlan {
  settlements: PlannedSettlement[];
  groups: PlannedGroupLeave[];
  fingerprint: string;
}

interface Remaining {
  userId: string;
  displayName: string;
  remaining: bigint;
}

// Same greedy pairing and tie-break as the app's simplified-debts view
// (code/fe/src/features/balances/simplify.ts), so the plan matches what users already see.
function simplifyLedger(rows: DeletionBalanceRow[]) {
  const byLargestBalanceThenId = (left: Remaining, right: Remaining) =>
    left.remaining === right.remaining
      ? left.userId.localeCompare(right.userId)
      : left.remaining > right.remaining
        ? -1
        : 1;
  const debtors = rows
    .filter((row) => BigInt(row.netMinor) < 0n)
    .map((row) => ({ ...row, remaining: -BigInt(row.netMinor) }))
    .sort(byLargestBalanceThenId);
  const creditors = rows
    .filter((row) => BigInt(row.netMinor) > 0n)
    .map((row) => ({ ...row, remaining: BigInt(row.netMinor) }))
    .sort(byLargestBalanceThenId);
  const payments: Array<{ from: Remaining; to: Remaining; amount: bigint }> =
    [];
  for (let debtorIndex = 0, creditorIndex = 0; debtorIndex < debtors.length;) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount =
      debtor.remaining < creditor.remaining
        ? debtor.remaining
        : creditor.remaining;
    payments.push({ from: debtor, to: creditor, amount });
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0n) debtorIndex += 1;
    if (creditor.remaining === 0n) creditorIndex += 1;
  }
  return payments;
}

export function buildDeletionPlan(
  userId: string,
  balances: DeletionBalanceRow[],
  groups: DeletionGroupRow[],
): DeletionPlan {
  const byLedger = new Map<string, DeletionBalanceRow[]>();
  for (const row of balances) {
    byLedger.set(row.ledgerId, [...(byLedger.get(row.ledgerId) ?? []), row]);
  }
  const settlements: PlannedSettlement[] = [];
  for (const [ledgerId, rows] of byLedger) {
    if (rows.reduce((total, row) => total + BigInt(row.netMinor), 0n) !== 0n) {
      throw new Error(`Ledger ${ledgerId} postings do not balance.`);
    }
    for (const payment of simplifyLedger(rows)) {
      if (payment.from.userId !== userId && payment.to.userId !== userId) {
        continue;
      }
      settlements.push({
        ledgerId,
        ledgerType: rows[0].ledgerType,
        groupName: rows[0].groupName,
        fromUserId: payment.from.userId,
        fromDisplayName: payment.from.displayName,
        toUserId: payment.to.userId,
        toDisplayName: payment.to.displayName,
        amountMinor: payment.amount.toString(),
      });
    }
  }
  const leaves = groups.map((group) => ({
    groupId: group.groupId,
    name: group.name,
    willArchive: group.activeMemberCount === 1,
  }));
  const fingerprint = createHash('sha256')
    .update(
      JSON.stringify([
        settlements.map((s) => [
          s.ledgerId,
          s.fromUserId,
          s.toUserId,
          s.amountMinor,
        ]),
        leaves.map((group) => group.groupId),
      ]),
    )
    .digest('hex');
  return { settlements, groups: leaves, fingerprint };
}
