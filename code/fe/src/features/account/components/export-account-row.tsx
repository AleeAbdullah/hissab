import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { Row } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { exportAccount } from '@/features/account/api';

// Android saves through the folder picker; iOS has no equivalent, so it uses the share sheet.
const usesFolderPicker = Platform.OS === 'android';

async function saveExport() {
  const fileName = `tally-stick-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
  if (!usesFolderPicker) {
    const snapshot = await exportAccount();
    const uri = `${FileSystem.cacheDirectory}${fileName}.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(snapshot, null, 2));
    try {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Save your Tally Stick data'
      });
    } finally {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
    // The share sheet is the confirmation; it can't tell us whether the file was saved.
    return false;
  }

  const folder =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!folder.granted) return false;

  const snapshot = await exportAccount();
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
          `Save a JSON snapshot of your profile, social state, financial history, activity, reminders, and notifications. ${usesFolderPicker ? 'You’ll choose a folder to save it.' : 'You’ll choose where to save or send it.'}`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Export', onPress: () => mutation.mutate() }
          ]
        )
      }
    />
  );
}
