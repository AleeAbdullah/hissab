import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Loading } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export default function TabLayout() {
  const session = useSession();
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  if (session === undefined) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <NativeTabs tintColor={primary}>
      <NativeTabs.Trigger name="groups">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.3', selected: 'person.3.fill' }}
          md="groups"
        />
        <NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'clock', selected: 'clock.fill' }}
          md="history"
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="personal">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          md="account_balance_wallet"
        />
        <NativeTabs.Trigger.Label>Personal</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'person.crop.circle',
            selected: 'person.crop.circle.fill'
          }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
