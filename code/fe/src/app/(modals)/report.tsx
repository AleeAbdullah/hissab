import { useLocalSearchParams } from 'expo-router';

import { ErrorMessage, Screen } from '@/components/ui';
import { ReportForm } from '@/features/reports/components/report-form';

export default function ReportScreen() {
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
          name={name || (targetType === 'USER' ? 'this person' : 'this group')}
        />
      ) : (
        <ErrorMessage
          error={new Error('Open Report from a person or group.')}
        />
      )}
    </Screen>
  );
}
