import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';

import type {
  DisplayCurrency,
  SharedExpense,
  SharedExpenseCategoryCode
} from '@/api/contracts';
import type { CreateExpenseDto } from '@/api/generated/types.gen';
import { DateField } from '@/components/date-field';
import { ErrorMessage, Field, Screen, Row } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { expenseCategoriesQuery } from '@/features/expenses/api';
import { MemberAmounts } from '@/features/expenses/components/member-amounts';
import {
  buildExpenseBody,
  expenseInitialValues,
  equalAllocations
} from '@/features/expenses/form';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { todayDate } from '@/lib/dates';
import { parseMinorAmount, minorToInput, formatMinorAmount } from '@/lib/money';

export type ExpenseFormDraft = {
  amount: string;
  categoryCode: SharedExpenseCategoryCode | null;
  description: string;
  occurredDate: string;
  payerAmounts: Record<string, string>;
  payerUserIds: string[];
  participantUserIds: string[];
  splitMethod: 'EQUAL' | 'EXACT';
  exactAmounts: Record<string, string>;
};

export function ExpenseEditor({
  currentUserId,
  ledgerName = 'Shared ledger',
  error,
  displayCurrency,
  expense,
  members,
  onSave,
  onDraftChange,
  onDiscard,
  savedDraft,
  saving
}: {
  currentUserId: string;
  ledgerName?: string;
  error?: unknown;
  displayCurrency: DisplayCurrency;
  expense?: SharedExpense;
  members: LedgerDraftMember[];
  onSave: (body: CreateExpenseDto) => void;
  onDraftChange?: (draft: ExpenseFormDraft | null) => void;
  onDiscard?: () => void;
  savedDraft?: ExpenseFormDraft | null;
  saving: boolean;
}) {
  const initial = expense
    ? expenseInitialValues(expense)
    : (savedDraft ?? null);
  const categories = useQuery(expenseCategoriesQuery);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [categoryCode, setCategoryCode] =
    useState<SharedExpenseCategoryCode | null>(initial?.categoryCode ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [occurredDate, setOccurredDate] = useState(
    initial?.occurredDate ?? todayDate()
  );
  const [payerAmounts, setPayerAmounts] = useState(
    initial?.payerAmounts ?? { [currentUserId]: '' }
  );
  const [payerUserIds, setPayerUserIds] = useState<string[]>(
    initial?.payerUserIds ?? [currentUserId]
  );
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(
    initial?.participantUserIds ?? members.map((member) => member.userId)
  );
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT'>(
    initial?.splitMethod ?? 'EQUAL'
  );
  const [exactAmounts, setExactAmounts] = useState(initial?.exactAmounts ?? {});
  const [validation, setValidation] = useState<{
    error: string;
    field: string;
    focusUserId?: string;
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const amountInput = useRef<TextInput>(null);
  const descriptionInput = useRef<TextInput>(null);
  const payerInputs = useRef<Record<string, TextInput | null>>({});
  const splitInputs = useRef<Record<string, TextInput | null>>({});
  const positions = useRef<Record<string, number>>({});
  const submitting = useRef(false);
  useEffect(() => {
    if (!saving) submitting.current = false;
  }, [saving, error]);
  useEffect(() => {
    if (!validation) return;
    const frame = requestAnimationFrame(() => {
      scroll.current?.scrollTo({
        y: Math.max(0, (positions.current[validation.field] ?? 0) - 20),
        animated: false
      });
      if (validation.field === 'amount') amountInput.current?.focus();
      if (validation.field === 'description') descriptionInput.current?.focus();
      if (validation.field === 'payers')
        payerInputs.current[validation.focusUserId ?? '']?.focus();
      if (validation.field === 'split')
        splitInputs.current[validation.focusUserId ?? '']?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [validation, expanded]);
  useEffect(() => {
    const value: ExpenseFormDraft = {
      amount,
      categoryCode,
      description,
      occurredDate,
      payerAmounts,
      payerUserIds,
      participantUserIds,
      splitMethod,
      exactAmounts
    };
    const defaultParticipants = members.map((member) => member.userId);
    const changedPayers =
      payerUserIds.length !== 1 || payerUserIds[0] !== currentUserId;
    const changedParticipants =
      participantUserIds.length !== defaultParticipants.length ||
      participantUserIds.some(
        (userId, index) => userId !== defaultParticipants[index]
      );
    const hasContent =
      Boolean(amount || categoryCode || description) ||
      occurredDate !== todayDate() ||
      changedPayers ||
      changedParticipants ||
      splitMethod === 'EXACT' ||
      Object.values(exactAmounts).some(Boolean);
    onDraftChange?.(hasContent ? value : null);
  }, [
    amount,
    categoryCode,
    currentUserId,
    description,
    exactAmounts,
    members,
    occurredDate,
    onDraftChange,
    participantUserIds,
    payerAmounts,
    payerUserIds,
    splitMethod
  ]);

  const updateAmount = (value: string) => {
    setAmount(value);
    if (validation?.field === 'amount') setValidation(null);
    if (payerUserIds.length === 1)
      setPayerAmounts((values) => ({ ...values, [payerUserIds[0]]: value }));
  };
  const save = () => {
    if (
      saving ||
      submitting.current ||
      categories.isLoading ||
      categories.error
    )
      return;
    const built = buildExpenseBody({
      amount,
      categoryCode,
      description,
      exactAmounts,
      occurredDate,
      payerAmounts:
        payerUserIds.length === 1
          ? { ...payerAmounts, [payerUserIds[0]]: amount }
          : payerAmounts,
      payerUserIds,
      participantUserIds,
      splitMethod
    });
    if ('error' in built) {
      const ids = built.field === 'payers' ? payerUserIds : participantUserIds;
      const values = built.field === 'payers' ? payerAmounts : exactAmounts;
      setValidation({
        ...built,
        focusUserId:
          ids.find(
            (id) => BigInt(parseMinorAmount(values[id] ?? '') ?? '0') <= 0n
          ) ?? ids[0]
      });
      if (['payers', 'split', 'category'].includes(built.field))
        setExpanded(built.field);
      return;
    }
    setValidation(null);
    submitting.current = true;
    onSave(built.body);
  };
  const total = parseMinorAmount(amount) ?? '0';
  const equal = equalAllocations(total, participantUserIds);
  const allocationStatus = (
    ids: string[],
    values: Record<string, string>,
    context: 'payers' | 'split'
  ) => {
    const assigned = ids.reduce(
      (sum, id) => sum + BigInt(parseMinorAmount(values[id] ?? '') ?? '0'),
      0n
    );
    const remaining = BigInt(total) - assigned;
    return remaining === 0n
      ? context === 'split'
        ? `${formatMinorAmount('0', displayCurrency)} left to split ✓`
        : `Paid ${formatMinorAmount(total, displayCurrency)} of ${formatMinorAmount(total, displayCurrency)} ✓`
      : `${formatMinorAmount((remaining < 0n ? -remaining : remaining).toString(), displayCurrency)} ${remaining < 0n ? 'overassigned' : context === 'split' ? 'left to split' : 'left to assign'}`;
  };
  const block = (field: string, content: ReactNode) => (
    <View
      onLayout={(event) => {
        positions.current[field] = event.nativeEvent.layout.y;
      }}
      className="gap-2"
    >
      {validation?.field === field ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-[15px] text-destructive"
        >
          {validation.error}
        </Text>
      ) : null}
      {content}
    </View>
  );
  const expand = (field: string, title: string, detail: string) => (
    <Button
      variant="ghost"
      disabled={saving}
      accessibilityState={{ expanded: expanded === field, disabled: saving }}
      className="w-full justify-start rounded-none border-b border-border py-3"
      onPress={() => setExpanded(expanded === field ? null : field)}
    >
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold">{title}</Text>
        <Text className="text-[15px] font-normal text-muted-foreground">
          {detail}
        </Text>
      </View>
      <Text>{expanded === field ? '⌃' : '⌄'}</Text>
    </Button>
  );
  return (
    <Screen
      scrollRef={scroll}
      footer={
        <View className="gap-2">
          {error ? <ErrorMessage error={error} /> : null}
          <Button
            disabled={
              saving || categories.isLoading || Boolean(categories.error)
            }
            accessibilityState={{
              disabled:
                saving || categories.isLoading || Boolean(categories.error),
              busy: saving
            }}
            onPress={save}
          >
            {saving ? (
              <ActivityIndicator className="text-primary-foreground" />
            ) : (
              <Text>{expense ? 'Save changes' : 'Save expense'}</Text>
            )}
          </Button>
        </View>
      }
    >
      <Text
        selectable
        className="text-[15px] leading-[22px] text-muted-foreground"
      >
        {ledgerName} · Shared ledger
      </Text>
      {expense ? (
        <Text selectable className="text-muted-foreground">
          Saving creates a new revision; history is kept.
        </Text>
      ) : null}
      {block(
        'amount',
        <Field
          inputRef={amountInput}
          autoFocus
          label={`Amount (${displayCurrency})`}
          placeholder="0.00"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={updateAmount}
          editable={!saving}
          className="text-center text-[32px]"
        />
      )}
      {block(
        'description',
        <Field
          inputRef={descriptionInput}
          label="Description"
          placeholder="e.g. Dinner at Kolachi"
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (validation?.field === 'description') setValidation(null);
          }}
          editable={!saving}
        />
      )}
      {block(
        'category',
        <>
          {expand(
            'category',
            'Category',
            categories.data?.find((category) => category.code === categoryCode)
              ?.name ?? 'Choose a category'
          )}
          {categories.error ? (
            <>
              <ErrorMessage error={categories.error} />
              <Button variant="outline" onPress={() => categories.refetch()}>
                <Text>Retry categories</Text>
              </Button>
            </>
          ) : null}
          {expanded === 'category'
            ? categories.data?.map((category) => (
                <Row
                  key={category.code}
                  title={category.name}
                  detail={
                    category.code === categoryCode ? 'Selected' : undefined
                  }
                  disabled={saving}
                  onPress={() => {
                    setCategoryCode(category.code);
                    if (validation?.field === 'category') setValidation(null);
                    setExpanded(null);
                  }}
                />
              ))
            : null}
        </>
      )}
      {block(
        'date',
        <DateField
          allowFuture
          disabled={saving}
          value={occurredDate}
          onChange={(value) => {
            if (!saving) setOccurredDate(value);
          }}
        />
      )}
      {block(
        'payers',
        <>
          {expand(
            'payers',
            'Paid by',
            payerUserIds.length
              ? payerUserIds
                  .map(
                    (id) =>
                      members.find((member) => member.userId === id)
                        ?.displayName ?? 'Member'
                  )
                  .join(', ')
              : 'Choose payers'
          )}
          {expanded === 'payers' ? (
            <>
              <MemberAmounts
                label="PAYERS"
                amounts={payerAmounts}
                displayCurrency={displayCurrency}
                members={members}
                selectedUserIds={payerUserIds}
                showAmounts={payerUserIds.length > 1}
                disabled={saving}
                onAmountRef={(id, node) => {
                  payerInputs.current[id] = node;
                }}
                onAmountsChange={setPayerAmounts}
                onSelectionChange={(ids) => {
                  setPayerUserIds(ids);
                  if (ids.length === 1)
                    setPayerAmounts((values) => ({
                      ...values,
                      [ids[0]]: amount
                    }));
                }}
              />
              <Text selectable className="text-[15px]">
                {allocationStatus(
                  payerUserIds,
                  payerUserIds.length === 1
                    ? { [payerUserIds[0]]: amount }
                    : payerAmounts,
                  'payers'
                )}
              </Text>
            </>
          ) : null}
        </>
      )}
      {block(
        'split',
        <>
          {expand(
            'split',
            'Split',
            `${splitMethod === 'EQUAL' ? 'Equal' : 'Exact'} · ${participantUserIds.length} ${participantUserIds.length === 1 ? 'person' : 'people'}`
          )}
          {splitMethod === 'EQUAL' ? (
            <Text
              selectable
              className="text-[15px] leading-[22px] text-muted-foreground"
            >
              {participantUserIds
                .map(
                  (id) =>
                    `${members.find((member) => member.userId === id)?.displayName ?? 'Member'} ${formatMinorAmount(equal[id] ?? '0', displayCurrency)}`
                )
                .join(' · ')}
            </Text>
          ) : null}
          {expanded === 'split' ? (
            <>
              <View className="flex-row rounded-xl bg-muted p-1">
                {(['EQUAL', 'EXACT'] as const).map((method) => (
                  <Button
                    key={method}
                    variant="ghost"
                    role="tab"
                    className={
                      splitMethod === method
                        ? 'flex-1 bg-card px-2'
                        : 'flex-1 px-2'
                    }
                    disabled={saving}
                    accessibilityState={{ selected: splitMethod === method }}
                    onPress={() => {
                      setSplitMethod(method);
                      if (
                        method === 'EXACT' &&
                        !Object.values(exactAmounts).some(Boolean)
                      )
                        setExactAmounts(
                          Object.fromEntries(
                            Object.entries(equal).map(([id, minor]) => [
                              id,
                              minorToInput(minor)
                            ])
                          )
                        );
                    }}
                  >
                    <Text
                      className={
                        splitMethod === method
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }
                    >
                      {method === 'EQUAL' ? 'Equal' : 'Exact'}
                    </Text>
                  </Button>
                ))}
              </View>
              <MemberAmounts
                label="PARTICIPANTS"
                amounts={exactAmounts}
                displayCurrency={displayCurrency}
                members={members}
                selectedUserIds={participantUserIds}
                showAmounts={splitMethod === 'EXACT'}
                disabled={saving}
                onAmountRef={(id, node) => {
                  splitInputs.current[id] = node;
                }}
                onAmountsChange={setExactAmounts}
                onSelectionChange={setParticipantUserIds}
              />
              {splitMethod === 'EXACT' ? (
                <>
                  <Text selectable className="text-[15px]">
                    {allocationStatus(
                      participantUserIds,
                      exactAmounts,
                      'split'
                    )}
                  </Text>
                  <Button
                    variant="link"
                    size="compact"
                    className="justify-start px-0"
                    disabled={saving}
                    onPress={() => setSplitMethod('EQUAL')}
                  >
                    <Text>Reset to equal split</Text>
                  </Button>
                </>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        A network connection is required to save. Tally Stick records debts; it
        does not move money.
      </Text>
      {onDiscard ? (
        <Button
          variant="destructiveOutline"
          disabled={saving}
          onPress={onDiscard}
        >
          <Text>{expense ? 'Discard changes' : 'Discard draft'}</Text>
        </Button>
      ) : null}
    </Screen>
  );
}
