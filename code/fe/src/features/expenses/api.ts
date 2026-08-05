import {
  expensesCreateExpense,
  expensesDeleteExpense,
  expensesGetExpense,
  expensesListCategories,
  expensesListExpenses,
  expensesReplaceExpense,
} from '@/api/generated/sdk.gen';
import type { CreateExpenseDto, ReplaceExpenseDto } from '@/api/generated/types.gen';
import type { SharedExpense, SharedExpenseCategory, SharedExpensePage } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export const expenseCategoriesQuery = {
  queryKey: ['shared-expense-categories'] as const,
  queryFn: () => request<SharedExpenseCategory[]>(() => expensesListCategories()),
};

export function listExpenses(ledgerId: string, cursor?: string) {
  return request<SharedExpensePage>(() => expensesListExpenses({ path: { ledgerId }, query: { cursor } }));
}

export function expenseQuery(expenseId: string) {
  return {
    queryKey: ['expenses', expenseId] as const,
    queryFn: () => request<SharedExpense>(() => expensesGetExpense({ path: { expenseId } })),
  };
}

export function createExpense(ledgerId: string, body: CreateExpenseDto) {
  return request<SharedExpense>(() => expensesCreateExpense({ path: { ledgerId }, body, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function replaceExpense(expenseId: string, body: ReplaceExpenseDto) {
  return request<SharedExpense>(() => expensesReplaceExpense({ path: { expenseId }, body, headers: { 'Idempotency-Key': idempotencyKey() } }));
}

export function deleteExpense(expenseId: string, expectedVersion: number) {
  return request<SharedExpense>(() => expensesDeleteExpense({ path: { expenseId }, query: { expectedVersion }, headers: { 'Idempotency-Key': idempotencyKey() } }));
}
