import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { isolate } from '@/i18n';

export function ReportForm({
  targetType,
  targetId,
  name
}: {
  targetType: ReportTargetType;
  targetId: string;
  name: string;
}) {
  const { t } = useTranslation(['reports', 'common']);
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
        t('reportSent'),
        t('thanksForTellingUsTheTallyStickTeamWillReview', {
          name: isolate(name)
        }),
        [{ text: t('common:done'), onPress: () => router.back() }],
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
          ? t('tellTheTallyStickTeamAboutAProblemWithReports', {
              name: isolate(name)
            })
          : t('tellTheTallyStickTeamAboutAProblemWithThe', {
              name: isolate(name)
            })}
      </Text>
      <SectionLabel>{t('reason')}</SectionLabel>
      <ChoiceChips
        choices={REPORT_REASONS.map((item) => ({
          ...item,
          label: t(item.label)
        }))}
        value={reason}
        onChange={(value) => setReason(value as ReportReason)}
      />
      <Field
        label={t('detailsOptional')}
        multiline
        value={details}
        onChangeText={setDetails}
        maxLength={1000}
        textAlignVertical="top"
        className="min-h-24"
        hint={t('whatHappenedUpTo1000Characters')}
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
          <Text>{send.isSuccess ? t('reportSent') : t('sendReport')}</Text>
        )}
      </Button>
    </View>
  );
}
