import type { ExpoConfig } from 'expo/config';

if (process.env.EAS_BUILD_PROFILE === 'production') {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl || new URL(apiUrl).protocol !== 'https:') {
    throw new Error('Production builds require an HTTPS EXPO_PUBLIC_API_URL.');
  }
}

const config: ExpoConfig = {
  name: 'Tally Stick',
  slug: 'hissab',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icons/app-icon-light.png',
  scheme: 'hissab',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.alee.hissab',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    icon: {
      light: './assets/images/icons/app-icon-light.png',
      dark: './assets/images/icons/app-icon-dark.png'
    }
  },
  android: {
    package: 'com.alee.hissab',
    adaptiveIcon: {
      backgroundColor: '#FDFDFD',
      foregroundImage: './assets/images/icons/app-icon-foreground.png',
      monochromeImage: './assets/images/icons/app-icon-foreground.png'
    },
    predictiveBackGestureEnabled: true
  },
  web: {
    output: 'static',
    favicon: './assets/images/icons/app-icon-light.png'
  },
  plugins: [
    'expo-router',
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-notifications',
    'expo-font',
    'expo-image',
    'expo-sharing',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FDFDFD',
        image: './assets/images/icons/icon-dark.png',
        imageWidth: 160,
        dark: {
          backgroundColor: '#091E2F',
          image: './assets/images/icons/icon-light.png'
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  owner: 'aleeabdullah',
  extra: {
    eas: {
      projectId: 'c2d7b3fd-3621-4a79-8ecb-de1857928973'
    }
  }
};

export default config;
