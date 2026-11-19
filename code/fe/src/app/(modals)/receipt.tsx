import { useTranslation } from 'react-i18next';

import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function ReceiptScreen() {
  const { t } = useTranslation(['expenses', 'common']);
  return (
    <ComingLaterScreen
      purpose={t('receiptAttachmentsAreIntentionallyUnavailableInTally')}
    />
  );
}
