import type {
  PersonalCategoryCode,
  PersonalTransaction,
  PersonalTransactionType
} from '@/api/contracts';
import type { CreatePersonalTransactionDto } from '@/api/generated/types.gen';
import { i18n, isolate } from '@/i18n';
import { dateToIso, formatDate, formatMonth, formatPeriod } from '@/lib/dates';
import { minorToInput, parseMinorAmount } from '@/lib/money';

export type PersonalTransactionField =
  'amount' | 'category' | 'description' | 'date';

export function buildPersonalTransactionBody(input: {
  amount: string;
  categoryCode: PersonalCategoryCode | null;
  description: string;
  merchantOrSource: string;
  notes: string;
  occurredDate: string;
  type: PersonalTransactionType;
}):
  | { body: CreatePersonalTransactionDto }
  | {
      error:
        | 'enterAnAmountGreaterThanZero'
        | 'chooseACategory'
        | 'enterADescription'
        | 'chooseAValidDate';
      field: PersonalTransactionField;
    } {
  const amountMinor = parseMinorAmount(input.amount);
  if (!amountMinor || BigInt(amountMinor) <= 0n)
    return { error: 'enterAnAmountGreaterThanZero', field: 'amount' };
  if (!input.categoryCode)
    return { error: 'chooseACategory', field: 'category' };
  if (!input.description.trim())
    return { error: 'enterADescription', field: 'description' };
  const occurredAt = dateToIso(input.occurredDate);
  if (!occurredAt) return { error: 'chooseAValidDate', field: 'date' };
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
  return bucket === 'MONTH' ? formatMonth(`${value}-01`) : formatDate(value);
}

export function historyPeriodLabel(from?: string, to?: string) {
  if (!from && !to) return i18n.t('personal:allTime');
  if (!from && to)
    return i18n.t('personal:periodUntil', { date: isolate(formatDate(to)) });
  if (from && !to)
    return i18n.t('personal:periodFrom', { date: isolate(formatDate(from)) });
  return formatPeriod(from, to);
}
