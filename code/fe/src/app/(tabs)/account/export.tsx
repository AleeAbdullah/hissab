import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { Button, ErrorMessage, Notice, Screen } from '@/components/ui';
import { exportAccount } from '@/features/account/api';

async function shareExport() {
  const snapshot = await exportAccount();
  if (!FileSystem.cacheDirectory) throw new Error('This device cannot prepare an export file.');
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');

  const file = `${FileSystem.cacheDirectory}hissab-export.json`;
  await FileSystem.writeAsStringAsync(file, JSON.stringify(snapshot, null, 2));
  await Sharing.shareAsync(file, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Export Hissab data',
  });
}

export default function ExportScreen() {
  const mutation = useMutation({ mutationFn: shareExport });

  return (
    <Screen>
      <Notice title="Your complete Hissab record">This creates a versioned JSON snapshot of your profile, social state, financial history, activity, reminders, and notifications.</Notice>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Button
        title={mutation.isPending ? 'Preparing export…' : 'Create and share JSON export'}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </Screen>
  );
}
