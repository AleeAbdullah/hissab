import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import type { Profile } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Field, Loading, Notice, Screen } from '@/components/ui';
import { ChoiceChips } from '@/components/choice-chips';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery, updateProfile } from '@/features/account/api';
import { CurrencyPicker } from '@/features/auth/currency-picker';
import { homeQuery } from '@/features/home/api';

export default function ProfileScreen() {
  const query = useQuery(profileQuery);
  if (query.isLoading) return <Loading />;
  if (query.error || !query.data)
    return (
      <Screen>
        <ErrorMessage error={query.error} />
      </Screen>
    );
  return <ProfileForm key={query.data.updatedAt} profile={query.data} />;
}

function ProfileForm({ profile }: { profile: Profile }) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [displayCurrency, setDisplayCurrency] = useState(
    profile.displayCurrency
  );
  const [timezone, setTimezone] = useState(profile.timezone);
  const [mode, setMode] = useState(profile.personalReportMode);
  const mutation = useMutation({
    mutationFn: () =>
      updateProfile({
        displayName: displayName.trim(),
        displayCurrency,
        timezone,
        personalReportMode: mode
      }),
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQuery.queryKey, profile);
      await queryClient.invalidateQueries({ queryKey: homeQuery.queryKey });
    }
  });
  const valid =
    displayName.trim().length > 0 &&
    Boolean(displayCurrency) &&
    timezone.length > 0;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              variant="link"
              disabled={!valid || mutation.isPending}
              accessibilityState={{
                disabled: !valid || mutation.isPending,
                busy: mutation.isPending
              }}
              onPress={() => mutation.mutate()}
            >
              {mutation.isPending ? (
                <ActivityIndicator className="text-primary" />
              ) : (
                <Text>Save</Text>
              )}
            </Button>
          )
        }}
      />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      {mutation.isSuccess ? (
        <Notice title="Saved">Your profile and defaults are up to date.</Notice>
      ) : null}
      <Field
        label="Display name"
        value={displayName}
        onChangeText={setDisplayName}
        hint="Everyone you share a ledger with sees this name."
      />
      <Field
        label="Email"
        value={profile.email}
        editable={false}
        hint="Changing your email is not supported in this version."
      />
      <CurrencyPicker value={displayCurrency} onChange={setDisplayCurrency} />
      <Field label="Timezone" value={timezone} onChangeText={setTimezone} />
      <Text selectable className="text-[13px] text-muted-foreground">
        Report mode
      </Text>
      <ChoiceChips
        choices={[
          { value: 'OWED_SHARE', label: 'Your share' },
          { value: 'CASH_OUT_OF_POCKET', label: 'Cash paid' }
        ]}
        value={mode}
        onChange={(value) => setMode(value as Profile['personalReportMode'])}
      />
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        Display currency changes the symbol Hissab uses for amounts. It does not
        convert stored values. Profile photos are not supported; initials are
        generated from your name.
      </Text>
    </Screen>
  );
}
