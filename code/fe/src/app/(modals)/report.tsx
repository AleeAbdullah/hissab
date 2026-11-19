import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ErrorMessage, Screen } from '@/components/ui';
import { ReportForm } from '@/features/reports/components/report-form';

export default function ReportScreen() {
  const { t } = useTranslation(['reports', 'common']);
  const { targetType, targetId, name } = useLocalSearchParams<{
    targetType?: string;
    targetId?: string;
    name?: string;
  }>();
  const valid =
    (targetType === 'USER' || targetType === 'GROUP') && Boolean(targetId);

  return (
    <Screen>
      {valid ? (
        <ReportForm
          targetType={targetType}
          targetId={targetId as string}
          name={
            name || (targetType === 'USER' ? t('thisPerson') : t('thisGroup'))
          }
        />
      ) : (
        <ErrorMessage error={new Error(t('openReportFromAPersonOrGroup'))} />
      )}
    </Screen>
  );
}
