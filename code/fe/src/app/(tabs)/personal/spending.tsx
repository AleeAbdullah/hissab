import { useQuery } from '@tanstack/react-query';

import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { SpendingDetails } from '@/features/personal/components/spending-details';

export default function SpendingScreen() {
  const profile = useQuery(profileQuery);
  if (profile.isLoading) return <Loading />;
  return (
    <Screen>
      {profile.error || !profile.data ? (
        <ErrorMessage
          error={profile.error ?? new Error('Profile is unavailable.')}
        />
      ) : (
        <SpendingDetails displayCurrency={profile.data.displayCurrency} />
      )}
    </Screen>
  );
}
