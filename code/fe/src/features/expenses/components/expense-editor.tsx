import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorMessage, Field, Notice, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { CreateExpenseDto } from '@/api/generated/types.gen';
import type { DisplayCurrency, SharedExpense, SharedExpenseCategoryCode } from '@/api/contracts';
import { ChoiceChips } from '@/components/choice-chips';
import { MemberAmounts } from '@/features/expenses/components/member-amounts';
import { expenseCategoriesQuery } from '@/features/expenses/api';
import { buildExpenseBody, expenseInitialValues, todayDate } from '@/features/expenses/form';
import type { LedgerDraftMember } from '@/features/ledger/draft';

export function ExpenseEditor({
  currentUserId,
  displayCurrency,
  expense,
  members,
  onSave,
  saving,
}: {
  currentUserId: string;
  displayCurrency: DisplayCurrency;
  expense?: SharedExpense;
  members: LedgerDraftMember[];
  onSave: (body: CreateExpenseDto) => void;
  saving: boolean;
}) {
  const initial = expense ? expenseInitialValues(expense) : null;
  const categories = useQuery(expenseCategoriesQuery);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [categoryCode, setCategoryCode] = useState<SharedExpenseCategoryCode | null>(initial?.categoryCode ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [occurredDate, setOccurredDate] = useState(initial?.occurredDate ?? todayDate());
  const [payerAmounts, setPayerAmounts] = useState(initial?.payerAmounts ?? { [currentUserId]: '' });
  const [payerUserIds, setPayerUserIds] = useState<string[]>(initial?.payerUserIds ?? [currentUserId]);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(initial?.participantUserIds ?? members.map((member) => member.userId));
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT'>(initial?.splitMethod ?? 'EQUAL');
  const [exactAmounts, setExactAmounts] = useState(initial?.exactAmounts ?? {});
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateAmount = (value: string) => {
    setAmount(value);
    if (payerUserIds.length === 1) setPayerAmounts({ ...payerAmounts, [payerUserIds[0]]: value });
  };
  const save = () => {
    const built = buildExpenseBody({ amount, categoryCode, description, exactAmounts, occurredDate, payerAmounts, payerUserIds, participantUserIds, splitMethod });
    if ('error' in built) return setValidationError(built.error);
    setValidationError(null);
    onSave(built.body);
  };

  return (
    <View className="gap-4">
      <Notice title="Shared expense">A network connection is required to save. Hissab records the debt; it does not move money.</Notice>
      {categories.error || validationError ? <ErrorMessage error={categories.error ?? new Error(validationError ?? '')} /> : null}
      <Field label={`Amount (${displayCurrency})`} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={updateAmount} />
      <Field label="Description" placeholder="e.g. Dinner" value={description} onChangeText={setDescription} />
      <Field label="Date" hint="YYYY-MM-DD" placeholder="2026-08-05" value={occurredDate} onChangeText={setOccurredDate} autoCapitalize="none" />
      <View className="gap-2">
        <SectionLabel>CATEGORY</SectionLabel>
        <ChoiceChips choices={(categories.data ?? []).map((category) => ({ label: category.name, value: category.code }))} value={categoryCode} onChange={(value) => setCategoryCode(value as SharedExpenseCategoryCode)} />
      </View>
      <MemberAmounts label="PAID BY" displayCurrency={displayCurrency} members={members} selectedUserIds={payerUserIds} amounts={payerAmounts} onSelectionChange={setPayerUserIds} onAmountsChange={setPayerAmounts} />
      <View className="gap-2">
        <SectionLabel>SPLIT METHOD</SectionLabel>
        <ChoiceChips choices={[{ label: 'Equal', value: 'EQUAL' }, { label: 'Exact', value: 'EXACT' }]} value={splitMethod} onChange={(value) => setSplitMethod(value as 'EQUAL' | 'EXACT')} />
      </View>
      <MemberAmounts label={splitMethod === 'EQUAL' ? 'SPLIT EQUALLY BETWEEN' : 'EXACT AMOUNTS OWED'} displayCurrency={displayCurrency} members={members} selectedUserIds={participantUserIds} amounts={exactAmounts} showAmounts={splitMethod === 'EXACT'} onSelectionChange={setParticipantUserIds} onAmountsChange={setExactAmounts} />
      <Button disabled={saving || categories.isLoading} accessibilityState={{ disabled: saving || categories.isLoading, busy: saving }} onPress={save}>
        {saving ? <ActivityIndicator className="text-primary-foreground" /> : <Text>{expense ? 'Save changes' : 'Save expense'}</Text>}
      </Button>
    </View>
  );
}
