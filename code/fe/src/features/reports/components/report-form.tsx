import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { ErrorMessage, Field, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import {
  createReport,
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType
} from '@/features/reports/api';

export function ReportForm({
  targetType,
  targetId,
  name
}: {
  targetType: ReportTargetType;
  targetId: string;
  name: string;
}) {
  const dialog = useDialog();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const sending = useRef(false);
  const send = useMutation({
    mutationFn: (chosen: ReportReason) =>
      createReport({
        targetType,
        targetId,
        reason: chosen,
        ...(details.trim() ? { details: details.trim() } : {})
      }),
    onSuccess: () =>
      dialog(
        'Report sent',
        `Thanks for telling us. The Tally Stick team will review it. ${name} won't be notified.`,
        [{ text: 'Done', onPress: () => router.back() }],
        { tone: 'success' }
      ),
    onSettled: () => {
      sending.current = false;
    }
  });
  const submit = () => {
    if (!reason || sending.current || send.isSuccess) return;
    sending.current = true;
    send.mutate(reason);
  };

  return (
    <View className="gap-4">
      <Text
        selectable
        className="text-[15px] leading-[22px] text-muted-foreground"
      >
        {targetType === 'USER'
          ? `Tell the Tally Stick team about a problem with ${name}.`
          : `Tell the Tally Stick team about a problem with the group ${name}.`}{' '}
        Reports are private. Nobody in the group or ledger is notified.
      </Text>
      <SectionLabel>REASON</SectionLabel>
      <ChoiceChips
        choices={REPORT_REASONS}
        value={reason}
        onChange={(value) => setReason(value as ReportReason)}
      />
      <Field
        label="Details (optional)"
        multiline
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
        textAlignVertical="top"
        className="min-h-24"
        hint="What happened? Up to 1,000 characters."
      />
      {send.error ? <ErrorMessage error={send.error} /> : null}
      <Button
        disabled={!reason || send.isPending || send.isSuccess}
        accessibilityState={{
          disabled: !reason || send.isPending || send.isSuccess,
          busy: send.isPending
        }}
        onPress={submit}
      >
        {send.isPending ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>{send.isSuccess ? 'Report sent' : 'Send report'}</Text>
        )}
      </Button>
    </View>
  );
}
