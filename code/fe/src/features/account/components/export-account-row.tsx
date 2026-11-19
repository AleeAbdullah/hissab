import { useMutation } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { Row } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { exportAccount } from '@/features/account/api';
import { i18n } from '@/i18n';

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
        dialogTitle: i18n.t('account:saveYourTallyStickData')
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
  const { t } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const mutation = useMutation({
    mutationFn: saveExport,
    onSuccess: (saved) => {
      if (saved)
        dialog(
          t('exportSaved'),
          t('theJsonFileIsInTheFolderYouChose'),
          [{ text: t('common:done') }],
          { tone: 'success' }
        );
    },
    onError: (error) =>
      dialog(
        t('exportFailed'),
        error.message,
        [
          { text: t('close'), style: 'cancel' },
          { text: t('common:tryAgain'), onPress: () => mutation.mutate() }
        ],
        { tone: 'error' }
      )
  });

  return (
    <Row
      title={t('exportYourData')}
      detail={mutation.isPending ? t('exporting') : undefined}
      disabled={mutation.isPending}
      onPress={() =>
        dialog(
          t('exportYourData2'),
          t(usesFolderPicker ? 'exportFolder' : 'exportShare'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            { text: t('export'), onPress: () => mutation.mutate() }
          ]
        )
      }
    />
  );
}
