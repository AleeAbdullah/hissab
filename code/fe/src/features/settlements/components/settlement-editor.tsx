import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View, ScrollView, TextInput } from 'react-native';

import type {
  DisplayCurrency,
  LedgerBalances,
  Settlement
} from '@/api/contracts';
import type { CreateSettlementDto } from '@/api/generated/types.gen';
import { AmountField } from '@/components/amount-field';
import { ChoiceChips } from '@/components/choice-chips';
import { DateField } from '@/components/date-field';
import { ErrorMessage, Row, Screen, SectionLabel } from '@/components/ui';
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
import { isolate } from '@/i18n';
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
  ledgerName,
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
  const { t } = useTranslation(['settlements', 'common']);
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
      ? t('settled')
      : t(value > 0n ? 'owed' : 'owes', {
          amount: isolate(
            formatMinorAmount(
              (value < 0n ? -value : value).toString(),
              displayCurrency
            )
          )
        });
  const save = () => {
    if (saving || submitting.current) return;
    if ('error' in body) {
      setValidation(t(body.error));
      scroll.current?.scrollTo({ y: 0, animated: false });
      if (
        !parseMinorAmount(amount) ||
        BigInt(parseMinorAmount(amount) ?? '0') <= 0n
      )
        amountInput.current?.focus();
      return;
    }
    if (!preview) {
      setValidation(t('needBalances'));
      return;
    }
    const from =
      members.find((member) => member.userId === body.body.fromUserId)
        ?.displayName ?? t('payer');
    const to =
      members.find((member) => member.userId === body.body.toUserId)
        ?.displayName ?? t('recipient');
    const warning = preview.excess > 0n || preview.wrongDirection;
    const effect = t('effect', {
      from: isolate(from),
      to: isolate(to),
      fromBefore: balanceText(preview.fromBefore),
      fromAfter: balanceText(preview.fromAfter),
      toBefore: balanceText(preview.toBefore),
      toAfter: balanceText(preview.toAfter)
    });
    const warningCopy = preview.wrongDirection
      ? t('directionWarning')
      : t('creditWarning', {
          amount: isolate(
            formatMinorAmount(preview.excess.toString(), displayCurrency)
          )
        });
    setValidation(null);
    dialog(
      warning
        ? preview.wrongDirection
          ? t('checkDirection')
          : t('createsCredit')
        : settlement
          ? t('saveQuestion')
          : t('recordQuestion'),
      t(warning ? 'warningConfirmation' : 'confirmation', {
        from: isolate(from),
        to: isolate(to),
        amount: isolate(
          formatMinorAmount(body.body.amountMinor, displayCurrency)
        ),
        date: isolate(formatDate(occurredDate)),
        effect,
        warning: warningCopy
      }),
      [
        {
          text: preview.wrongDirection
            ? t('editPayment')
            : warning
              ? t('editAmount')
              : t('common:cancel'),
          style: 'cancel'
        },
        {
          text: warning
            ? settlement
              ? t('saveCredit')
              : t('recordCredit')
            : settlement
              ? t('saveChanges')
              : t('recordPayment'),
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
          {t('whichBalance')}
        </Text>
        <Text selectable>{ledgerName ?? t('sharedLedger')}</Text>
        <SectionLabel>{t('suggested')}</SectionLabel>
        <Text selectable className="text-muted-foreground">
          {t('suggestedHint')}
        </Text>
        {error ? <ErrorMessage error={error} /> : null}
        {!balances ? (
          <Text>{t('loadingBalances')}</Text>
        ) : payments === null ? (
          <ErrorMessage
            fallback={t('unbalanced')}
            error={new Error(t('unbalanced'))}
          />
        ) : candidates.length ? (
          candidates.map((payment) => (
            <Row
              key={`${payment.fromUserId}:${payment.toUserId}`}
              title={t(
                payment.fromUserId === currentUserId ? 'youPay' : 'paysYou',
                {
                  name: isolate(
                    payment.fromUserId === currentUserId
                      ? payment.toDisplayName
                      : payment.fromDisplayName
                  ),
                  amount: isolate(
                    formatMinorAmount(payment.amountMinor, displayCurrency)
                  )
                }
              )}
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
          <Text selectable>{t('noSuggestions')}</Text>
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
          <Text>{t('differentPayment')}</Text>
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
              <Text>
                {settlement ? t('reviewChanges') : t('reviewPayment')}
              </Text>
            )}
          </Button>
        </View>
      }
    >
      <Text selectable className="text-[15px] text-muted-foreground">
        {ledgerName ?? t('sharedLedger')}
      </Text>
      {savedDraft && !initialPayment && !settlement ? (
        <Text selectable className="text-muted-foreground">
          {t('restored')}
        </Text>
      ) : null}
      {settlement ? (
        <Text selectable className="text-muted-foreground">
          {t('revision')}
        </Text>
      ) : null}
      {validation ? (
        <Text accessibilityLiveRegion="polite" className="text-destructive">
          {validation}
        </Text>
      ) : null}
      <AmountField
        inputRef={amountInput}
        autoFocus
        displayCurrency={displayCurrency}
        value={amount}
        onChangeText={setAmount}
        editable={!saving}
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
        <SectionLabel>{t('paidBy')}</SectionLabel>
        <ChoiceChips
          choices={members.map((member) => ({
            label: member.displayName,
            value: member.userId
          }))}
          value={fromUserId}
          onChange={(value) => {
            if (saving) return;
            setFromUserId(value);
            if (value === toUserId) setToUserId('');
          }}
        />
        <SectionLabel>{t('receivedBy')}</SectionLabel>
        <ChoiceChips
          // The payer can't also receive, so they're left out of this row.
          choices={members
            .filter((member) => member.userId !== fromUserId)
            .map((member) => ({
              label: member.displayName,
              value: member.userId
            }))}
          value={toUserId}
          onChange={(value) => {
            if (!saving) setToUserId(value);
          }}
        />
      </View>
      {members.length < 2 ? <Text selectable>{t('twoMembers')}</Text> : null}
      {preview ? (
        <View className="gap-2">
          <SectionLabel>{t('afterPayment')}</SectionLabel>
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
              {t('memberEffect', {
                name: isolate(
                  members.find((person) => person.userId === member.id)
                    ?.displayName ?? t('member')
                ),
                before: balanceText(member.before),
                after: balanceText(member.after)
              })}
            </Text>
          ))}
        </View>
      ) : null}
      <Text selectable className="text-[13px] text-muted-foreground">
        {t('externalOnly')}
      </Text>
      {/* New records close with the X; only edits need an explicit discard here. */}
      {onDiscard && settlement ? (
        <Button
          variant="destructiveOutline"
          disabled={saving}
          onPress={onDiscard}
        >
          <Text>{t('discardChanges')}</Text>
        </Button>
      ) : null}
    </Screen>
  );
}
