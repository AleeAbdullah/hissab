import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';

import { Row } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { exportAccount } from '@/features/account/api';

async function saveExport() {
  const folder =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!folder.granted) return false;

  const snapshot = await exportAccount();
  const fileName = `tally-stick-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  const file = await FileSystem.StorageAccessFramework.createFileAsync(
    folder.directoryUri,
    fileName,
    'application/json'
  );
  await FileSystem.StorageAccessFramework.writeAsStringAsync(
    file,
    JSON.stringify(snapshot, null, 2)
  );
  return true;
}

export function ExportAccountRow() {
  const dialog = useDialog();
  const mutation = useMutation({
    mutationFn: saveExport,
    onSuccess: (saved) => {
      if (saved)
        dialog(
          'Export saved',
          'The JSON file is in the folder you chose.',
          [{ text: 'Done' }],
          { tone: 'success' }
        );
    },
    onError: (error) =>
      dialog(
        'Export failed',
        error.message,
        [
          { text: 'Close', style: 'cancel' },
          { text: 'Try again', onPress: () => mutation.mutate() }
        ],
        { tone: 'error' }
      )
  });

  return (
    <Row
      title="Export your data"
      detail={mutation.isPending ? 'Exporting…' : undefined}
      disabled={mutation.isPending}
      onPress={() =>
        dialog(
          'Export your data?',
          'Save a JSON snapshot of your profile, social state, financial history, activity, reminders, and notifications. You’ll choose a folder to save it.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Export', onPress: () => mutation.mutate() }
          ]
        )
      }
    />
  );
}
