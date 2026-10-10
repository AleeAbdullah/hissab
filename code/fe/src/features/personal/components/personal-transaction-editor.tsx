import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CreatePersonalTransactionDto } from '@/api/generated/types.gen';
import type {
  DisplayCurrency,
  PersonalCategoryCode,
  PersonalTransaction,
  PersonalTransactionType
} from '@/api/contracts';
import { ErrorMessage, Field } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { todayDate } from '@/features/expenses/form';
import { personalCategoriesQuery } from '@/features/personal/api';
import { CategoryPicker } from '@/features/personal/components/category-picker';
import { TransactionDateField } from '@/features/personal/components/transaction-date-field';
import {
  buildPersonalTransactionBody,
  personalTransactionInitialValues,
  type PersonalTransactionField
} from '@/features/personal/form';
import { formatMinorAmount } from '@/lib/utils';

export type PersonalTransactionFormDraft = {
  amount: string;
  categoryCode: PersonalCategoryCode | null;
  description: string;
  merchantOrSource: string;
  notes: string;
  occurredDate: string;
  type: PersonalTransactionType;
};

type FieldErrors = Partial<Record<PersonalTransactionField, string>>;

const TYPES: { label: string; value: PersonalTransactionType }[] = [
  { label: 'Expense', value: 'EXPENSE' },
  { label: 'Income', value: 'INCOME' }
];

function currencySymbol(displayCurrency: DisplayCurrency) {
  return formatMinorAmount('0', displayCurrency)
    .replace(/0\.00$/, '')
    .trim();
}

export function PersonalTransactionEditor({
  displayCurrency,
  error,
  onSave,
  onDraftChange,
  savedDraft,
  saving,
  transaction
}: {
  displayCurrency: DisplayCurrency;
  error?: unknown;
  onSave: (body: CreatePersonalTransactionDto) => void;
  onDraftChange?: (draft: PersonalTransactionFormDraft | null) => void;
  savedDraft?: PersonalTransactionFormDraft | null;
  saving: boolean;
  transaction?: PersonalTransaction;
}) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(
    () => Keyboard.metrics()?.height ?? 0
  );
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const initial = transaction
    ? personalTransactionInitialValues(transaction)
    : (savedDraft ?? null);
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
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(initial?.merchantOrSource || initial?.notes)
  );
  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Partial<Record<PersonalTransactionField, number>>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  useEffect(() => {
    const value: PersonalTransactionFormDraft = {
      amount,
      categoryCode,
      description,
      merchantOrSource,
      notes,
      occurredDate,
      type
    };
    const hasContent =
      Boolean(
        amount || categoryCode || description || merchantOrSource || notes
      ) ||
      occurredDate !== todayDate() ||
      type !== 'EXPENSE';
    onDraftChange?.(hasContent ? value : null);
  }, [
    amount,
    categoryCode,
    description,
    merchantOrSource,
    notes,
    occurredDate,
    onDraftChange,
    type
  ]);
  // Android reports the keyboard height without the navigation-bar inset.
  const keyboardPadding = keyboardHeight
    ? keyboardHeight + (Platform.OS === 'android' ? insets.bottom : 0)
    : 0;
  const availableCategories = (categories.data ?? []).filter(
    (category) => category.kind === type
  );
  const clearError = (field: PersonalTransactionField) =>
    setFieldErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current
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
    if ('error' in built) {
      setFieldErrors({ [built.field]: built.error });
      scrollRef.current?.scrollTo({
        y: Math.max((fieldY.current[built.field] ?? 0) - 16, 0),
        animated: true
      });
      return;
    }
    setFieldErrors({});
    onSave(built.body);
  };
  const detailsLabel =
    type === 'INCOME' ? 'Add source or note' : 'Add merchant or note';
  const saveLabel = transaction
    ? 'Save changes'
    : type === 'INCOME'
      ? 'Save income'
      : 'Save expense';

  return (
    <View className="flex-1" style={{ paddingBottom: keyboardPadding }}>
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pb-6 pt-2"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="gap-2">
          <View className="flex-row rounded-2xl bg-secondary p-1">
            {TYPES.map((choice) => {
              const selected = choice.value === type;
              return (
                <Button
                  key={choice.value}
                  variant="ghost"
                  className={
                    selected ? 'flex-1 rounded-xl bg-card' : 'flex-1 rounded-xl'
                  }
                  accessibilityLabel={choice.label}
                  accessibilityState={{ selected }}
                  onPress={() => changeType(choice.value)}
                >
                  <Text
                    className={
                      selected ? 'text-primary' : 'text-muted-foreground'
                    }
                  >
                    {choice.label}
                  </Text>
                </Button>
              );
            })}
          </View>
          <Text className="text-[13px] leading-[18px] text-muted-foreground">
            Only you can see this.
          </Text>
        </View>

        <View
          className="items-center gap-1.5"
          onLayout={(event) => {
            fieldY.current.amount = event.nativeEvent.layout.y;
          }}
        >
          <Text className="text-[13px] text-muted-foreground">Amount</Text>
          <View className="min-h-14 flex-row items-center justify-center gap-2 self-stretch">
            <Text
              className={
                amount
                  ? 'text-[40px] font-semibold leading-[48px] text-foreground'
                  : 'text-[40px] font-semibold leading-[48px] text-muted-foreground'
              }
            >
              {currencySymbol(displayCurrency)}
            </Text>
            <TextInput
              accessibilityLabel={`Amount in ${displayCurrency}`}
              autoFocus={!transaction}
              keyboardType="decimal-pad"
              placeholder="0"
              value={amount}
              onChangeText={(value) => {
                setAmount(value);
                clearError('amount');
              }}
              className="min-w-6 shrink py-0 text-[40px] font-semibold leading-[48px] text-foreground placeholder:text-muted-foreground"
            />
          </View>
          {fieldErrors.amount ? (
            <Text
              selectable
              className="text-center text-[13px] leading-[18px] text-destructive"
            >
              {fieldErrors.amount}
            </Text>
          ) : null}
        </View>

        <View
          className="gap-2"
          onLayout={(event) => {
            fieldY.current.category = event.nativeEvent.layout.y;
          }}
        >
          <Text className="text-[13px] text-muted-foreground">Category</Text>
          <CategoryPicker
            categories={availableCategories}
            loading={categories.isLoading}
            value={categoryCode}
            onChange={(code) => {
              setCategoryCode(code);
              clearError('category');
            }}
          />
          {categories.error ? <ErrorMessage error={categories.error} /> : null}
          {fieldErrors.category ? (
            <Text
              selectable
              className="text-[13px] leading-[18px] text-destructive"
            >
              {fieldErrors.category}
            </Text>
          ) : null}
        </View>

        <View
          onLayout={(event) => {
            fieldY.current.description = event.nativeEvent.layout.y;
          }}
        >
          <Field
            label="Description"
            placeholder={type === 'INCOME' ? 'e.g. Salary' : 'e.g. Groceries'}
            value={description}
            error={fieldErrors.description}
            onChangeText={(value) => {
              setDescription(value);
              clearError('description');
            }}
          />
        </View>

        <View
          onLayout={(event) => {
            fieldY.current.date = event.nativeEvent.layout.y;
          }}
        >
          <TransactionDateField
            value={occurredDate}
            error={fieldErrors.date}
            onChange={(value) => {
              setOccurredDate(value);
              clearError('date');
            }}
          />
        </View>

        <View className="gap-4">
          <Button
            variant="ghost"
            className="min-h-12 w-full justify-start gap-2 px-0"
            accessibilityLabel={`${detailsLabel}, ${detailsOpen ? 'expanded' : 'collapsed'}`}
            accessibilityState={{ expanded: detailsOpen }}
            onPress={() => setDetailsOpen((open) => !open)}
          >
            <Text className="flex-1 text-[15px] font-semibold text-primary">
              {detailsLabel}
            </Text>
            <Icon
              as={detailsOpen ? ChevronUp : ChevronDown}
              size={20}
              className="text-muted-foreground"
            />
          </Button>
          {detailsOpen ? (
            <>
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
            </>
          ) : null}
        </View>
      </ScrollView>
      <View
        className="gap-3 border-t border-border bg-background px-5 pt-3"
        style={{
          paddingBottom: keyboardHeight ? 12 : Math.max(insets.bottom, 12)
        }}
      >
        {error ? <ErrorMessage error={error} /> : null}
        <Button
          disabled={saving}
          accessibilityState={{ disabled: saving, busy: saving }}
          onPress={save}
        >
          {saving ? (
            <ActivityIndicator className="text-primary-foreground" />
          ) : (
            <Text>{saveLabel}</Text>
          )}
        </Button>
      </View>
    </View>
  );
}
