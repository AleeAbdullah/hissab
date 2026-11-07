import type { SharedExpense, SharedExpenseCategoryCode } from '@/api/contracts';
import type { CreateExpenseDto } from '@/api/generated/types.gen';
import { dateToIso } from '@/lib/dates';
import { minorToInput, parseMinorAmount } from '@/lib/money';

export type AmountInputs = Record<string, string>;

export function buildExpenseBody(input: {
  amount: string;
  categoryCode: SharedExpenseCategoryCode | null;
  description: string;
  exactAmounts: AmountInputs;
  occurredDate: string;
  payerAmounts: AmountInputs;
  payerUserIds: string[];
  participantUserIds: string[];
  splitMethod: 'EQUAL' | 'EXACT';
}):
  | { body: CreateExpenseDto }
  | {
      error: string;
      field:
        'amount' | 'description' | 'category' | 'date' | 'payers' | 'split';
    } {
  const totalMinor = parseMinorAmount(input.amount);
  if (!totalMinor || BigInt(totalMinor) <= 0n)
    return { error: 'Enter an amount greater than zero.', field: 'amount' };
  if (!input.description.trim())
    return { error: 'Enter a description.', field: 'description' };
  if (!input.categoryCode)
    return { error: 'Choose a category.', field: 'category' };
  const occurredAt = dateToIso(input.occurredDate);
  if (!occurredAt)
    return { error: 'Enter a valid date as YYYY-MM-DD.', field: 'date' };
  const payers = allocationsFor(input.payerUserIds, input.payerAmounts);
  if ('error' in payers) return { ...payers, field: 'payers' };
  if (sum(payers.map((payer) => payer.amountMinor)) !== BigInt(totalMinor))
    return {
      error: 'Payer amounts must add up to the total.',
      field: 'payers'
    };
  if (!input.participantUserIds.length)
    return { error: 'Choose at least one participant.', field: 'split' };
  if (input.splitMethod === 'EQUAL') {
    return {
      body: {
        categoryCode: input.categoryCode,
        description: input.description.trim(),
        occurredAt,
        payers,
        split: {
          method: 'EQUAL',
          participantUserIds: input.participantUserIds
        },
        totalMinor
      }
    };
  }
  const allocations = allocationsFor(
    input.participantUserIds,
    input.exactAmounts
  );
  if ('error' in allocations) return { ...allocations, field: 'split' };
  if (
    sum(allocations.map((allocation) => allocation.amountMinor)) !==
    BigInt(totalMinor)
  )
    return {
      error: 'Exact split amounts must add up to the total.',
      field: 'split'
    };
  return {
    body: {
      categoryCode: input.categoryCode,
      description: input.description.trim(),
      occurredAt,
      payers,
      split: { method: 'EXACT', allocations },
      totalMinor
    }
  };
}

export function expenseInitialValues(expense: SharedExpense) {
  return {
    amount: minorToInput(expense.totalMinor),
    categoryCode: expense.category.code,
    description: expense.description,
    exactAmounts: Object.fromEntries(
      expense.participants.map((item) => [
        item.userId,
        minorToInput(item.owedMinor)
      ])
    ),
    occurredDate: expense.occurredAt.slice(0, 10),
    payerAmounts: Object.fromEntries(
      expense.payers.map((item) => [
        item.userId,
        minorToInput(item.amountMinor)
      ])
    ),
    payerUserIds: expense.payers.map((item) => item.userId),
    participantUserIds: expense.participants.map((item) => item.userId),
    splitMethod: expense.participants[0]?.splitMethod ?? 'EQUAL'
  } as const;
}

function allocationsFor(userIds: string[], values: AmountInputs) {
  const allocations = userIds.map((userId) => ({
    userId,
    amountMinor: parseMinorAmount(values[userId] ?? '')
  }));
  if (
    allocations.some(
      (allocation) =>
        !allocation.amountMinor || BigInt(allocation.amountMinor) <= 0n
    )
  )
    return { error: 'Each selected person needs an amount greater than zero.' };
  return allocations as { userId: string; amountMinor: string }[];
}

function sum(amounts: string[]) {
  return amounts.reduce((total, amount) => total + BigInt(amount), 0n);
}

export function equalAllocations(totalMinor: string, userIds: string[]) {
  const ids = [...new Set(userIds)].sort();
  if (!ids.length) return {} as Record<string, string>;
  const total = BigInt(totalMinor);
  const base = total / BigInt(ids.length);
  const remainder = Number(total % BigInt(ids.length));
  return Object.fromEntries(
    ids.map((id, index) => [
      id,
      (base + (index < remainder ? 1n : 0n)).toString()
    ])
  );
}
