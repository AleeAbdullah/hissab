import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, ScrollView, TextInput } from 'react-native';

import type {
  DisplayCurrency,
  LedgerBalances,
  Settlement
} from '@/api/contracts';
import type { CreateSettlementDto } from '@/api/generated/types.gen';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import {
  ErrorMessage,
  Field,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import {
  buildSettlementBody,
  settlementInitialValues,
  settlementPreview
} from '@/features/settlements/form';
import { todayDate, formatDate } from '@/lib/dates';
import { parseMinorAmount, minorToInput, formatMinorAmount } from '@/lib/money';

export type SettlementFormDraft = {
  amount: string;
  fromUserId: string;
  occurredDate: string;
  toUserId: string;
};

export function SettlementEditor({
  balances,
  currentUserId,
  displayCurrency,
  members,
  onSave,
  onDraftChange,
  onDiscard,
  savedDraft,
  saving,
  settlement,
  initialPayment,
  ledgerName = 'Shared ledger',
  error
}: {
  balances?: LedgerBalances;
  currentUserId: string;
  displayCurrency: DisplayCurrency;
  members: LedgerDraftMember[];
  onSave: (body: CreateSettlementDto) => void;
  onDraftChange?: (draft: SettlementFormDraft | null) => void;
  onDiscard?: () => void;
  savedDraft?: SettlementFormDraft | null;
  saving: boolean;
  settlement?: Settlement;
  initialPayment?: { amount: string; fromUserId: string; toUserId: string };
  ledgerName?: string;
  error?: unknown;
}) {
  const dialog = useDialog();
  const initial = settlement
    ? settlementInitialValues(settlement)
    : (initialPayment ?? savedDraft);
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [fromUserId, setFromUserId] = useState(initial?.fromUserId ?? '');
  const [toUserId, setToUserId] = useState(initial?.toUserId ?? '');
  const [occurredDate, setOccurredDate] = useState(
    settlement
      ? settlement.occurredAt.slice(0, 10)
      : initialPayment
        ? todayDate()
        : (savedDraft?.occurredDate ?? todayDate())
  );
  const [picking, setPicking] = useState(
    Boolean(
      initialPayment &&
      (initialPayment.fromUserId || initialPayment.toUserId) &&
      (!initialPayment.fromUserId || !initialPayment.toUserId)
    )
  );
  const [validation, setValidation] = useState<string | null>(null);
  const submitting = useRef(false);
  const scroll = useRef<ScrollView>(null);
  const amountInput = useRef<TextInput>(null);
  useEffect(() => {
    if (!saving) submitting.current = false;
  }, [saving, error]);
  useEffect(() => {
    if (picking) return;
    const hasContent =
      Boolean(amount || fromUserId || toUserId) || occurredDate !== todayDate();
    onDraftChange?.(
      hasContent ? { amount, fromUserId, toUserId, occurredDate } : null
    );
  }, [amount, fromUserId, toUserId, occurredDate, onDraftChange, picking]);
  const body = buildSettlementBody({
    amount,
    fromUserId,
    toUserId,
    occurredDate
  });
  const preview =
    'body' in body && balances
      ? settlementPreview(body.body, balances, settlement)
      : null;
  const balanceText = (value: bigint) =>
    value === 0n
      ? 'settled'
      : `${value > 0n ? 'owed' : 'owes'} ${formatMinorAmount((value < 0n ? -value : value).toString(), displayCurrency)}`;
  const save = () => {
    if (saving || submitting.current) return;
    if ('error' in body) {
      setValidation(body.error);
      scroll.current?.scrollTo({ y: 0, animated: false });
      if (
        !parseMinorAmount(amount) ||
        BigInt(parseMinorAmount(amount) ?? '0') <= 0n
      )
        amountInput.current?.focus();
      return;
    }
    if (!preview) {
      setValidation(
        'Authoritative balances are needed to review this payment.'
      );
      return;
    }
    const from =
      members.find((member) => member.userId === body.body.fromUserId)
        ?.displayName ?? 'Payer';
    const to =
      members.find((member) => member.userId === body.body.toUserId)
        ?.displayName ?? 'Recipient';
    const warning = preview.excess > 0n || preview.wrongDirection;
    const effect = `${from}: ${balanceText(preview.fromBefore)} → ${balanceText(preview.fromAfter)}. ${to}: ${balanceText(preview.toBefore)} → ${balanceText(preview.toAfter)}.`;
    const warningCopy = preview.wrongDirection
      ? 'This payment does not match the current debt direction. Review the resulting balances.'
      : `The amount beyond the current payable balance is ${formatMinorAmount(preview.excess.toString(), displayCurrency)} and becomes credit.`;
    setValidation(null);
    dialog(
      warning
        ? preview.wrongDirection
          ? 'Check payment direction'
          : 'This creates credit'
        : settlement
          ? 'Save payment changes?'
          : 'Record external payment?',
      `${from} paid ${to} ${formatMinorAmount(body.body.amountMinor, displayCurrency)} outside Tally Stick on ${formatDate(occurredDate)} (UTC). ${warning ? warningCopy + ' ' : ''}${effect} Tally Stick records it; it does not move money.`,
      [
        {
          text: preview.wrongDirection
            ? 'Edit payment'
            : warning
              ? 'Edit amount'
              : 'Cancel',
          style: 'cancel'
        },
        {
          text: warning
            ? settlement
              ? 'Save with credit'
              : 'Record with credit'
            : settlement
              ? 'Save changes'
              : 'Record payment',
          onPress: () => {
            if (submitting.current) return;
            submitting.current = true;
            onSave(body.body);
          }
        }
      ],
      warning ? { tone: 'warning' } : undefined
    );
  };
  const payments =
    picking && balances ? simplifyLedgerBalances(balances.members) : undefined;
  const candidates =
    payments?.filter(
      (payment) =>
        (payment.fromUserId === currentUserId ||
          payment.toUserId === currentUserId) &&
        members.some((member) => member.userId === payment.fromUserId) &&
        members.some((member) => member.userId === payment.toUserId)
    ) ?? [];
  if (picking)
    return (
      <Screen>
        <Text accessibilityRole="header" className="text-2xl font-semibold">
          Which balance do you want to settle?
        </Text>
        <Text selectable>{ledgerName}</Text>
        <SectionLabel>Suggested payments</SectionLabel>
        <Text selectable className="text-muted-foreground">
          Based on Simplify debts. Tally Stick tracks each member&apos;s total
          in this group, not who owes whom. Nothing is recorded until you
          confirm.
        </Text>
        {error ? <ErrorMessage error={error} /> : null}
        {!balances ? (
          <Text>Loading balances…</Text>
        ) : payments === null ? (
          <ErrorMessage
            error={new Error('Group balances do not add up to zero.')}
          />
        ) : candidates.length ? (
          candidates.map((payment) => (
            <Row
              key={`${payment.fromUserId}:${payment.toUserId}`}
              title={
                (payment.fromUserId === currentUserId
                  ? `You pay ${payment.toDisplayName}`
                  : `${payment.fromDisplayName} pays you`) +
                ` · ${formatMinorAmount(payment.amountMinor, displayCurrency)}`
              }
              onPress={() => {
                setFromUserId(payment.fromUserId);
                setToUserId(payment.toUserId);
                setAmount(minorToInput(payment.amountMinor));
                setOccurredDate(todayDate());
                setPicking(false);
              }}
            />
          ))
        ) : (
          <Text selectable>No suggested payments involve you.</Text>
        )}
        <Button
          variant="link"
          size="compact"
          className="justify-start px-0"
          role="link"
          disabled={members.length < 2}
          onPress={() => {
            setFromUserId('');
            setToUserId('');
            setAmount('');
            setOccurredDate(todayDate());
            setPicking(false);
          }}
        >
          <Text>Record a different payment</Text>
        </Button>
      </Screen>
    );
  return (
    <Screen
      scrollRef={scroll}
      footer={
        <View className="gap-2">
          {error ? <ErrorMessage error={error} /> : null}
          <Button
            disabled={saving || members.length < 2 || !balances}
            accessibilityState={{
              disabled: saving || members.length < 2 || !balances,
              busy: saving
            }}
            onPress={save}
          >
            {saving ? (
              <ActivityIndicator className="text-primary-foreground" />
            ) : (
              <Text>{settlement ? 'Review changes' : 'Review payment'}</Text>
            )}
          </Button>
        </View>
      }
    >
      <Text selectable className="text-[15px] text-muted-foreground">
        External payment · {ledgerName}
      </Text>
      {savedDraft && !initialPayment && !settlement ? (
        <Text selectable className="text-muted-foreground">
          Restored your saved payment draft. Review the people and amount.
        </Text>
      ) : null}
      {settlement ? (
        <Text selectable className="text-muted-foreground">
          Saving creates a replacement revision; history is kept.
        </Text>
      ) : null}
      {validation ? (
        <Text accessibilityLiveRegion="polite" className="text-destructive">
          {validation}
        </Text>
      ) : null}
      <Field
        inputRef={amountInput}
        autoFocus
        label={`Amount (${displayCurrency})`}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        editable={!saving}
        className="text-center text-[32px]"
      />
      <DateField
        allowFuture
        disabled={saving}
        value={occurredDate}
        onChange={(value) => {
          if (!saving) setOccurredDate(value);
        }}
      />
      <View pointerEvents={saving ? 'none' : 'auto'} className="gap-3">
        <SectionLabel>PAID BY</SectionLabel>
        <ChoiceChips
          choices={members.map((member) => ({
            label: member.displayName,
            value: member.userId
          }))}
          value={fromUserId}
          onChange={(value) => {
            if (!saving) setFromUserId(value);
          }}
        />
        <SectionLabel>RECEIVED BY</SectionLabel>
        <ChoiceChips
          choices={members.map((member) => ({
            label: member.displayName,
            value: member.userId
          }))}
          value={toUserId}
          onChange={(value) => {
            if (!saving) setToUserId(value);
          }}
        />
      </View>
      {members.length < 2 ? (
        <Text selectable>An external payment needs two active members.</Text>
      ) : null}
      {preview ? (
        <View className="gap-2">
          <SectionLabel>AFTER THIS PAYMENT</SectionLabel>
          {[
            {
              id: fromUserId,
              before: preview.fromBefore,
              after: preview.fromAfter
            },
            { id: toUserId, before: preview.toBefore, after: preview.toAfter }
          ].map((member) => (
            <Text
              key={member.id}
              selectable
              className="text-[15px] leading-[22px]"
            >
              {
                members.find((person) => person.userId === member.id)
                  ?.displayName
              }
              : {balanceText(member.before)} → {balanceText(member.after)}
            </Text>
          ))}
        </View>
      ) : null}
      <Text selectable className="text-[13px] text-muted-foreground">
        Record money already paid or received elsewhere. Tally Stick does not
        move money.
      </Text>
      {onDiscard ? (
        <Button
          variant="destructiveOutline"
          disabled={saving}
          onPress={onDiscard}
        >
          <Text>{settlement ? 'Discard changes' : 'Discard draft'}</Text>
        </Button>
      ) : null}
    </Screen>
  );
}
