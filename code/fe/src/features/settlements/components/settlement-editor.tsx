import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorMessage, Field, Notice, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { CreateSettlementDto } from '@/api/generated/types.gen';
import type { DisplayCurrency, LedgerBalances, Settlement } from '@/api/contracts';
import { ChoiceChips } from '@/components/choice-chips';
import { todayDate } from '@/features/expenses/form';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { buildSettlementBody, settlementInitialValues } from '@/features/settlements/form';

export function SettlementEditor({
  balances,
  currentUserId,
  displayCurrency,
  members,
  onSave,
  saving,
  settlement,
}: {
  balances?: LedgerBalances;
  currentUserId: string;
  displayCurrency: DisplayCurrency;
  members: LedgerDraftMember[];
  onSave: (body: CreateSettlementDto, createsCredit: boolean) => void;
  saving: boolean;
  settlement?: Settlement;
}) {
  const initial = settlement ? settlementInitialValues(settlement) : null;
  const otherUserId = members.find((member) => member.userId !== currentUserId)?.userId ?? '';
  const [amount, setAmount] = useState(initial?.amount ?? '');
  const [fromUserId, setFromUserId] = useState(initial?.fromUserId ?? currentUserId);
  const [toUserId, setToUserId] = useState(initial?.toUserId ?? otherUserId);
  const [occurredDate, setOccurredDate] = useState(initial?.occurredDate ?? todayDate());
  const [validationError, setValidationError] = useState<string | null>(null);
  const save = () => {
    const built = buildSettlementBody({ amount, fromUserId, occurredDate, toUserId });
    if ('error' in built) return setValidationError(built.error);
    setValidationError(null);
    onSave(built.body, createsCredit(built.body, balances, settlement));
  };

  return (
    <View className="gap-4">
      <Notice title="External payment">Record money already paid or received elsewhere. Hissab does not move money.</Notice>
      {validationError ? <ErrorMessage error={new Error(validationError)} /> : null}
      <Field label={`Amount (${displayCurrency})`} placeholder="0.00" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
      <Field label="Date" hint="YYYY-MM-DD" placeholder="2026-08-05" value={occurredDate} onChangeText={setOccurredDate} autoCapitalize="none" />
      <Choice label="PAID BY" choices={members.map((member) => ({ label: member.displayName, value: member.userId }))} value={fromUserId} onChange={setFromUserId} />
      <Choice label="RECEIVED BY" choices={members.map((member) => ({ label: member.displayName, value: member.userId }))} value={toUserId} onChange={setToUserId} />
      <Button disabled={saving || members.length < 2} accessibilityState={{ disabled: saving || members.length < 2, busy: saving }} onPress={save}>
        {saving ? <ActivityIndicator className="text-primary-foreground" /> : <Text>{settlement ? 'Save changes' : 'Record payment'}</Text>}
      </Button>
    </View>
  );
}

function Choice({ label, choices, value, onChange }: { label: string; choices: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return <View className="gap-2"><SectionLabel>{label}</SectionLabel><ChoiceChips choices={choices} value={value} onChange={onChange} /></View>;
}

function createsCredit(body: CreateSettlementDto, balances?: LedgerBalances, replacing?: Settlement) {
  const members = balances?.members;
  if (!members) return true;
  const net = new Map(members.map((member) => [member.userId, BigInt(member.netMinor)]));
  if (replacing) {
    net.set(replacing.fromUserId, (net.get(replacing.fromUserId) ?? 0n) - BigInt(replacing.amountMinor));
    net.set(replacing.toUserId, (net.get(replacing.toUserId) ?? 0n) + BigInt(replacing.amountMinor));
  }
  const from = net.get(body.fromUserId);
  const to = net.get(body.toUserId);
  if (from === undefined || to === undefined || from >= 0n || to <= 0n) return true;
  const payable = [-from, to].reduce((lowest, value) => value < lowest ? value : lowest);
  return BigInt(body.amountMinor) > payable;
}
