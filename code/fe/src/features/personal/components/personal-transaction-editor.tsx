import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { CreatePersonalTransactionDto } from '@/api/generated/types.gen';
import type {
  DisplayCurrency,
  PersonalCategoryCode,
  PersonalTransaction,
  PersonalTransactionType
} from '@/api/contracts';
import { ErrorMessage, Field, Notice, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ChoiceChips } from '@/components/choice-chips';
import { todayDate } from '@/features/expenses/form';
import { personalCategoriesQuery } from '@/features/personal/api';
import {
  buildPersonalTransactionBody,
  personalTransactionInitialValues
} from '@/features/personal/form';

export function PersonalTransactionEditor({
  displayCurrency,
  onSave,
  saving,
  transaction
}: {
  displayCurrency: DisplayCurrency;
  onSave: (body: CreatePersonalTransactionDto) => void;
  saving: boolean;
  transaction?: PersonalTransaction;
}) {
  const initial = transaction
    ? personalTransactionInitialValues(transaction)
    : null;
  const categories = useQuery(personalCategoriesQuery);
  const [type, setType] = useState<PersonalTransactionType>(
    initial?.type ?? 'EXPENSE'
  );
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [categoryCode, setCategoryCode] = useState<PersonalCategoryCode | null>(
    initial?.categoryCode ?? null
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [occurredDate, setOccurredDate] = useState(
    initial?.occurredDate ?? todayDate()
  );
  const [merchantOrSource, setMerchantOrSource] = useState(
    initial?.merchantOrSource ?? ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const availableCategories = (categories.data ?? []).filter(
    (category) => category.kind === type
  );
  const changeType = (value: PersonalTransactionType) => {
    setType(value);
    if (
      !(categories.data ?? []).some(
        (category) => category.kind === value && category.code === categoryCode
      )
    )
      setCategoryCode(null);
  };
  const save = () => {
    const built = buildPersonalTransactionBody({
      amount,
      categoryCode,
      description,
      merchantOrSource,
      notes,
      occurredDate,
      type
    });
    if ('error' in built) return setValidationError(built.error);
    setValidationError(null);
    onSave(built.body);
  };

  return (
    <View className="gap-4">
      <Notice title="Personal transaction">
        This record is private. It does not change any shared ledger or move
        money.
      </Notice>
      {categories.error || validationError ? (
        <ErrorMessage
          error={categories.error ?? new Error(validationError ?? '')}
        />
      ) : null}
      <Choice
        label="TYPE"
        choices={[
          { label: 'Expense', value: 'EXPENSE' },
          { label: 'Income', value: 'INCOME' }
        ]}
        value={type}
        onChange={(value) => changeType(value as PersonalTransactionType)}
      />
      <Field
        label={`Amount (${displayCurrency})`}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Field
        label="Description"
        placeholder={type === 'INCOME' ? 'e.g. Salary' : 'e.g. Groceries'}
        value={description}
        onChangeText={setDescription}
      />
      <Field
        label="Date"
        hint="YYYY-MM-DD"
        placeholder="2026-08-06"
        value={occurredDate}
        onChangeText={setOccurredDate}
        autoCapitalize="none"
      />
      <Choice
        label="CATEGORY"
        choices={availableCategories.map((category) => ({
          label: category.name,
          value: category.code
        }))}
        value={categoryCode}
        onChange={(value) => setCategoryCode(value as PersonalCategoryCode)}
      />
      <SectionLabel>OPTIONAL</SectionLabel>
      <Field
        label={type === 'INCOME' ? 'Source' : 'Merchant'}
        value={merchantOrSource}
        onChangeText={setMerchantOrSource}
      />
      <Field
        label="Notes"
        multiline
        value={notes}
        onChangeText={setNotes}
        textAlignVertical="top"
        className="min-h-24"
      />
      <Button
        disabled={saving || categories.isLoading}
        accessibilityState={{
          disabled: saving || categories.isLoading,
          busy: saving
        }}
        onPress={save}
      >
        {saving ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>{transaction ? 'Save changes' : 'Save transaction'}</Text>
        )}
      </Button>
    </View>
  );
}

function Choice({
  choices,
  label,
  onChange,
  value
}: {
  choices: { label: string; value: string }[];
  label: string;
  onChange: (value: string) => void;
  value: string | null;
}) {
  return (
    <View className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      <ChoiceChips choices={choices} value={value} onChange={onChange} />
    </View>
  );
}
