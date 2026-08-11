import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Profile } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Field, Loading, Notice, Screen } from '@/components/ui';
import { profileQuery, updateProfile } from '@/features/account/api';
import { CurrencyPicker } from '@/features/auth/currency-picker';
import { homeQuery } from '@/features/home/api';
import { useAppTheme } from '@/theme/theme';

export default function ProfileScreen() {
  const query = useQuery(profileQuery);
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data) return <Screen><ErrorMessage error={query.error} /></Screen>;
  return <ProfileForm key={query.data.updatedAt} profile={query.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [displayCurrency, setDisplayCurrency] = useState(profile.displayCurrency);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [mode, setMode] = useState(profile.personalReportMode);
  const mutation = useMutation({
    mutationFn: () => updateProfile({ displayName: displayName.trim(), displayCurrency, timezone, personalReportMode: mode }),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQuery.queryKey, profile);
      await queryClient.invalidateQueries({ queryKey: homeQuery.queryKey });
    },
  });
  const valid = displayName.trim().length > 0 && Boolean(displayCurrency) && timezone.length > 0;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !valid || mutation.isPending }} disabled={!valid || mutation.isPending} onPress={() => mutation.mutate()} style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={{ color: valid ? colors.brand : colors.secondary, fontSize: 17, fontWeight: '600' }}>{mutation.isPending ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          ),
        }}
      />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      {mutation.isSuccess ? <Notice title="Saved">Your profile and defaults are up to date.</Notice> : null}
      <Field label="Display name" value={displayName} onChangeText={setDisplayName} hint="Everyone you share a ledger with sees this name." />
      <Field label="Email" value={profile.email} editable={false} hint="Changing your email is not supported in this version." />
      <CurrencyPicker value={displayCurrency} onChange={setDisplayCurrency} />
      <Field label="Timezone" value={timezone} onChangeText={setTimezone} />
      <Text selectable style={{ color: colors.secondary, fontSize: 13 }}>Report mode</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([['OWED_SHARE', 'Your share'], ['CASH_OUT_OF_POCKET', 'Cash paid']] as const).map(([value, label]) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: mode === value }} onPress={() => setMode(value)} style={{ flex: 1, minHeight: 48, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand, backgroundColor: mode === value ? colors.brandSubtle : colors.surface }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>Display currency changes the symbol Hissab uses for amounts. It does not convert stored values. Profile photos are not supported; initials are generated from your name.</Text>
    </Screen>
  );
}
