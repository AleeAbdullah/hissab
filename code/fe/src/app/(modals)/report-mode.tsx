import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { Profile } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Notice, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery, updateProfile } from '@/features/account/api';
import { ChoiceChips } from '@/components/choice-chips';

export default function ReportModeScreen() {
  const query = useQuery(profileQuery);
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <Screen><ErrorMessage error={query.error ?? new Error('Profile is unavailable.')} /></Screen>;
  return <ReportModeForm key={query.data.updatedAt} profile={query.data} />;
}

function ReportModeForm({ profile }: { profile: Profile }) {
  const [mode, setMode] = useState(profile.personalReportMode);
  const update = useMutation({
    mutationFn: () => updateProfile({ personalReportMode: mode }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(profileQuery.queryKey, updated);
      await queryClient.invalidateQueries({ queryKey: ['personal', 'report'] });
      router.back();
    },
  });
  const explanation = mode === 'OWED_SHARE'
    ? 'Shared expenses count only the part you owe. Use this to answer what shared costs you are responsible for.'
    : 'Shared expenses count what you paid. Use this to answer how much cash you put toward shared costs.';
  return (
    <Screen>
      <Notice title="How shared expenses are counted">This changes Personal reports only. It never changes anyone’s balance.</Notice>
      {update.error ? <ErrorMessage error={update.error} /> : null}
      <View className="gap-2">
        <SectionLabel>REPORT MODE</SectionLabel>
        <ChoiceChips choices={[{ label: 'Your share', value: 'OWED_SHARE' }, { label: 'Cash paid', value: 'CASH_OUT_OF_POCKET' }]} value={mode} onChange={(value) => setMode(value as Profile['personalReportMode'])} />
      </View>
      <Text selectable className="leading-6 text-muted-foreground">{explanation}</Text>
      <Button disabled={update.isPending} accessibilityState={{ disabled: update.isPending, busy: update.isPending }} onPress={() => update.mutate()}>
        {update.isPending ? <ActivityIndicator className="text-primary-foreground" /> : <Text>Save report mode</Text>}
      </Button>
    </Screen>
  );
}
