import type { CreatePersonalTransactionDto } from '@/api/generated/types.gen';
import type {
  PersonalCategoryCode,
  PersonalTransaction,
  PersonalTransactionType
} from '@/api/contracts';
import {
  dateToIso,
  minorToInput,
  parseMinorAmount
} from '@/features/expenses/form';

export function buildPersonalTransactionBody(input: {
  amount: string;
  categoryCode: PersonalCategoryCode | null;
  description: string;
  merchantOrSource: string;
  notes: string;
  occurredDate: string;
  type: PersonalTransactionType;
}): { body: CreatePersonalTransactionDto } | { error: string } {
  const amountMinor = parseMinorAmount(input.amount);
  if (!amountMinor || BigInt(amountMinor) <= 0n)
    return { error: 'Enter an amount greater than zero.' };
  if (!input.categoryCode) return { error: 'Choose a category.' };
  if (!input.description.trim()) return { error: 'Enter a description.' };
  const occurredAt = dateToIso(input.occurredDate);
  if (!occurredAt) return { error: 'Enter a valid date as YYYY-MM-DD.' };
  return {
    body: {
      type: input.type,
      amountMinor,
      categoryCode: input.categoryCode,
      description: input.description.trim(),
      occurredAt,
      merchantOrSource: input.merchantOrSource.trim() || null,
      notes: input.notes.trim() || null
    }
  };
}

export function personalTransactionInitialValues(
  transaction: PersonalTransaction
) {
  return {
    amount: minorToInput(transaction.amountMinor),
    categoryCode: transaction.category.code,
    description: transaction.description,
    merchantOrSource: transaction.merchantOrSource ?? '',
    notes: transaction.notes ?? '',
    occurredDate: transaction.occurredAt.slice(0, 10),
    type: transaction.type
  } as const;
}

export function periodLabel(value: string, bucket: 'DAY' | 'MONTH') {
  if (bucket === 'MONTH') {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric'
    }).format(new Date(Date.UTC(year, (month ?? 1) - 1, 1)));
  }
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${value}T12:00:00.000Z`));
}

export function dateToExclusiveIso(value: string) {
  const iso = dateToIso(value);
  if (!iso) return null;
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}
