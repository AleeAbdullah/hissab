import type { CreateSettlementDto } from '@/api/generated/types.gen';
import type { Settlement } from '@/api/contracts';
import {
  dateToIso,
  minorToInput,
  parseMinorAmount
} from '@/features/expenses/form';

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
