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
  // Declares the app languages to iOS (App Store "Languages" and the per-app
  // Language setting). Roman Urdu has no iOS language; the in-app picker covers it.
  locales: Object.fromEntries(
    ['en', 'ar', 'es', 'fr', 'hi', 'ur', 'zh-Hans'].map((lang) => [
      lang,
      { ios: { CFBundleDisplayName: 'Tally Stick' } }
    ])
  ),
  ios: {
    bundleIdentifier: 'com.alee.hissab',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    icon: {
      light: './assets/images/icons/app-icon-light.png',
      dark: './assets/images/icons/app-icon-dark.png',
      tinted: './assets/images/icons/app-icon-tinted.png'
    }
  },
  android: {
    package: 'com.alee.hissab',
    // Firebase config for FCM push (project tally-stick). Identifiers only, not secrets.
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#A83A1B',
      foregroundImage: './assets/images/icons/app-icon-foreground.png',
      monochromeImage: './assets/images/icons/app-icon-monochrome.png'
    },
    predictiveBackGestureEnabled: true,
    // Defaults the app never uses: export shares from the cache directory, and
    // secure-store never requires biometric authentication.
    blockedPermissions: [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT'
    ]
  },
  web: {
    output: 'static',
    favicon: './assets/images/icons/app-icon-light.png'
  },
  plugins: [
    'expo-router',
    'expo-localization',
    './plugins/with-rtl-preferences.cjs',
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-notifications',
    'expo-font',
    'expo-image',
    'expo-sharing',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F7F3EC',
        image: './assets/images/icons/icon-dark.png',
        imageWidth: 160,
        dark: {
          backgroundColor: '#1D1D1B',
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
