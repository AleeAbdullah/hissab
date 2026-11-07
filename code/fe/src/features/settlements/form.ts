import type { Settlement, LedgerBalances } from '@/api/contracts';
import type { CreateSettlementDto } from '@/api/generated/types.gen';
import { dateToIso } from '@/lib/dates';
import { minorToInput, parseMinorAmount } from '@/lib/money';

export function buildSettlementBody(input: {
  amount: string;
  fromUserId: string;
  occurredDate: string;
  toUserId: string;
}): { body: CreateSettlementDto } | { error: string } {
  const amountMinor = parseMinorAmount(input.amount);
  if (!amountMinor || BigInt(amountMinor) <= 0n)
    return { error: 'Enter an amount greater than zero.' };
  if (!input.fromUserId || !input.toUserId)
    return { error: 'Choose who paid and who received the payment.' };
  if (input.fromUserId === input.toUserId)
    return { error: 'The payer and recipient must be different people.' };
  const occurredAt = dateToIso(input.occurredDate);
  if (!occurredAt) return { error: 'Enter a valid date as YYYY-MM-DD.' };
  return {
    body: {
      amountMinor,
      fromUserId: input.fromUserId,
      occurredAt,
      toUserId: input.toUserId
    }
  };
}

export function settlementInitialValues(settlement: Settlement) {
  return {
    amount: minorToInput(settlement.amountMinor),
    fromUserId: settlement.fromUserId,
    occurredDate: settlement.occurredAt.slice(0, 10),
    toUserId: settlement.toUserId
  };
}

export function settlementPreview(
  body: CreateSettlementDto,
  balances: LedgerBalances,
  replacing?: Settlement
) {
  const current = new Map(
    balances.members.map((member) => [member.userId, BigInt(member.netMinor)])
  );
  const fromBefore = current.get(body.fromUserId);
  const toBefore = current.get(body.toUserId);
  if (
    fromBefore === undefined ||
    toBefore === undefined ||
    body.fromUserId === body.toUserId
  )
    return null;
  const net = new Map(current);
  if (replacing) {
    net.set(
      replacing.fromUserId,
      (net.get(replacing.fromUserId) ?? 0n) - BigInt(replacing.amountMinor)
    );
    net.set(
      replacing.toUserId,
      (net.get(replacing.toUserId) ?? 0n) + BigInt(replacing.amountMinor)
    );
  }
  const from = net.get(body.fromUserId);
  const to = net.get(body.toUserId);
  if (from === undefined || to === undefined) return null;
  const amount = BigInt(body.amountMinor);
  const wrongDirection = from >= 0n || to <= 0n;
  const payable = wrongDirection ? 0n : -from < to ? -from : to;
  return {
    fromBefore,
    toBefore,
    fromAfter: from + amount,
    toAfter: to - amount,
    payable,
    excess: amount > payable ? amount - payable : 0n,
    wrongDirection
  };
}

export function suggestedSettlement(ownMinor: string, otherMinor: string) {
  const own = BigInt(ownMinor);
  const other = BigInt(otherMinor);
  if (own === 0n || other === 0n || own > 0n === other > 0n) return null;
  const ownAmount = own < 0n ? -own : own;
  const otherAmount = other < 0n ? -other : other;
  return minorToInput(
    (ownAmount < otherAmount ? ownAmount : otherAmount).toString()
  );
}
