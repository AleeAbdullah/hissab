import type { CreateExpenseDto } from '@/api/generated/types.gen';
import type { SharedExpense, SharedExpenseCategoryCode, SupportedCurrency } from '@/api/contracts';

export type AmountInputs = Record<string, string>;

export function parseMinorAmount(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return (whole * 100n + BigInt(fraction || '0')).toString();
}

export function minorToInput(minor: string) {
  const digits = BigInt(minor).toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export function buildExpenseBody(input: {
  amount: string;
  categoryCode: SharedExpenseCategoryCode | null;
  currency: SupportedCurrency;
  description: string;
  exactAmounts: AmountInputs;
  occurredDate: string;
  payerAmounts: AmountInputs;
  payerUserIds: string[];
  participantUserIds: string[];
  splitMethod: 'EQUAL' | 'EXACT';
}): { body: CreateExpenseDto } | { error: string } {
  const totalMinor = parseMinorAmount(input.amount);
  if (!totalMinor || BigInt(totalMinor) <= 0n) return { error: 'Enter an amount greater than zero.' };
  if (!input.description.trim()) return { error: 'Enter a description.' };
  if (!input.categoryCode) return { error: 'Choose a category.' };
  const occurredAt = dateToIso(input.occurredDate);
  if (!occurredAt) return { error: 'Enter a valid date as YYYY-MM-DD.' };
  const payers = allocationsFor(input.payerUserIds, input.payerAmounts);
  if ('error' in payers) return payers;
  if (sum(payers.map((payer) => payer.amountMinor)) !== BigInt(totalMinor)) return { error: 'Payer amounts must add up to the total.' };
  if (!input.participantUserIds.length) return { error: 'Choose at least one participant.' };
  if (input.splitMethod === 'EQUAL') {
    return { body: { categoryCode: input.categoryCode, currency: input.currency, description: input.description.trim(), occurredAt, payers, split: { method: 'EQUAL', participantUserIds: input.participantUserIds }, totalMinor } };
  }
  const allocations = allocationsFor(input.participantUserIds, input.exactAmounts);
  if ('error' in allocations) return allocations;
  if (sum(allocations.map((allocation) => allocation.amountMinor)) !== BigInt(totalMinor)) return { error: 'Exact split amounts must add up to the total.' };
  return { body: { categoryCode: input.categoryCode, currency: input.currency, description: input.description.trim(), occurredAt, payers, split: { method: 'EXACT', allocations }, totalMinor } };
}

export function expenseInitialValues(expense: SharedExpense) {
  return {
    amount: minorToInput(expense.totalMinor),
    categoryCode: expense.category.code,
    description: expense.description,
    exactAmounts: Object.fromEntries(expense.participants.map((item) => [item.userId, minorToInput(item.owedMinor)])),
    occurredDate: expense.occurredAt.slice(0, 10),
    payerAmounts: Object.fromEntries(expense.payers.map((item) => [item.userId, minorToInput(item.amountMinor)])),
    payerUserIds: expense.payers.map((item) => item.userId),
    participantUserIds: expense.participants.map((item) => item.userId),
    splitMethod: expense.participants[0]?.splitMethod ?? 'EQUAL',
  } as const;
}

function allocationsFor(userIds: string[], values: AmountInputs) {
  const allocations = userIds.map((userId) => ({ userId, amountMinor: parseMinorAmount(values[userId] ?? '') }));
  if (allocations.some((allocation) => !allocation.amountMinor || BigInt(allocation.amountMinor) <= 0n)) return { error: 'Each selected person needs an amount greater than zero.' };
  return allocations as { userId: string; amountMinor: string }[];
}

function sum(amounts: string[]) {
  return amounts.reduce((total, amount) => total + BigInt(amount), 0n);
}

export function dateToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date.toISOString() : null;
}

export function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
