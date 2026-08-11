import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import type { Profile } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { Button, ErrorMessage, Loading, Notice, Screen, SectionLabel } from '@/components/ui';
import { profileQuery, updateProfile } from '@/features/account/api';
import { ChoiceChips } from '@/features/expenses/components/choice-chips';
import { useAppTheme } from '@/theme/theme';

export default function ReportModeScreen() {
  const query = useQuery(profileQuery);
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <Screen><ErrorMessage error={query.error ?? new Error('Profile is unavailable.')} /></Screen>;
  return <ReportModeForm key={query.data.updatedAt} profile={query.data} />;
}

function ReportModeForm({ profile }: { profile: Profile }) {
  const { colors } = useAppTheme();
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
      <View style={{ gap: 8 }}>
        <SectionLabel>REPORT MODE</SectionLabel>
        <ChoiceChips choices={[{ label: 'Your share', value: 'OWED_SHARE' }, { label: 'Cash paid', value: 'CASH_OUT_OF_POCKET' }]} value={mode} onChange={(value) => setMode(value as Profile['personalReportMode'])} />
      </View>
      <Text selectable style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>{explanation}</Text>
      <Button title="Save report mode" loading={update.isPending} onPress={() => update.mutate()} />
    </Screen>
  );
}
