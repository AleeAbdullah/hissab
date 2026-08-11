import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Hissab",
  slug: "hissab",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icons/app-icon-light.png",
  scheme: "hissab",
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: "com.alee.hissab",
    icon: {
      light: "./assets/images/icons/app-icon-light.png",
      dark: "./assets/images/icons/app-icon-dark.png",
    },
  },
  android: {
    package: "com.alee.hissab",
    adaptiveIcon: {
      backgroundColor: "#FDFDFD",
      foregroundImage: "./assets/images/icons/app-icon-foreground.png",
      monochromeImage: "./assets/images/icons/app-icon-foreground.png",
    },
    predictiveBackGestureEnabled: true,
  },
  web: {
    output: "static",
    favicon: "./assets/images/icons/app-icon-light.png",
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-notifications",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FDFDFD",
        image: "./assets/images/icons/icon-dark.png",
        imageWidth: 160,
        dark: {
          backgroundColor: "#091E2F",
          image: "./assets/images/icons/icon-light.png",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
