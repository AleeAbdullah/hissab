import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Redirect, useSegments } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform, useWindowDimensions } from 'react-native';

import { Loading } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export default function TabLayout() {
  const session = useSession();
  const segments = useSegments();
  const { fontScale } = useWindowDimensions();
  const primary = useThemeVariable(THEME_VARIABLES.primaryText);
  const background = useThemeVariable(THEME_VARIABLES.background);
  const muted = useThemeVariable(THEME_VARIABLES.mutedForeground);
  // Only Android tab labels cap scaling; screen content follows the system scale.
  const labelFontSize =
    Platform.OS === 'android' ? 12 / Math.max(fontScale, 1) : 12;
  // Android exposes one label weight per item, rather than per selected state.
  const androidLabelProps = (name: string) =>
    Platform.OS === 'android'
      ? {
          android: {
            standardAppearance: {
              tabBarBackgroundColor: background,
              tabBarItemActiveIndicatorEnabled: false,
              tabBarItemLabelVisibilityMode: 'labeled' as const,
              tabBarItemTitleSmallLabelFontSize: labelFontSize,
              tabBarItemTitleLargeLabelFontSize: labelFontSize,
              tabBarItemTitleFontWeight:
                segments[1] === name ? ('600' as const) : ('400' as const),
              normal: {
                tabBarItemTitleFontColor: muted,
                tabBarItemIconColor: muted
              },
              selected: {
                tabBarItemTitleFontColor: primary,
                tabBarItemIconColor: primary
              }
            }
          }
        }
      : undefined;
  if (session === undefined) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;

  return (
    <NativeTabs
      tintColor={primary}
      backgroundColor={background}
      iconColor={{ default: muted, selected: primary }}
      labelStyle={{
        default: { color: muted, fontSize: labelFontSize, fontWeight: '400' },
        selected: { color: primary, fontSize: labelFontSize, fontWeight: '600' }
      }}
      labelVisibilityMode="labeled"
      disableIndicator
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger
        name="groups"
        unstable_nativeProps={androidLabelProps('groups')}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.3', selected: 'person.3.fill' }}
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="account-group-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="account-group"
              />
            )
          }}
        />
        <NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="activity"
        unstable_nativeProps={androidLabelProps('activity')}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'clock', selected: 'clock.fill' }}
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="clock-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="clock"
              />
            )
          }}
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="home"
        unstable_nativeProps={androidLabelProps('home')}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="home-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="home"
              />
            )
          }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="personal"
        unstable_nativeProps={androidLabelProps('personal')}
      >
        <NativeTabs.Trigger.Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="wallet-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="wallet"
              />
            )
          }}
        />
        <NativeTabs.Trigger.Label>Personal</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger
        name="account"
        unstable_nativeProps={androidLabelProps('account')}
      >
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'person.crop.circle',
            selected: 'person.crop.circle.fill'
          }}
          src={{
            default: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="account-circle-outline"
              />
            ),
            selected: (
              <NativeTabs.Trigger.VectorIcon
                family={MaterialCommunityIcons}
                name="account-circle"
              />
            )
          }}
        />
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
