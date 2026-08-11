// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

const themeBoundaryFiles = [
  "src/app/_layout.tsx",
  "src/app/(tabs)/_layout.tsx",
  "src/app/(tabs)/account/notifications.tsx",
  "src/app/(tabs)/activity/index.tsx",
  "src/features/home/screen.tsx",
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "src/api/generated/**"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/theme.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{ name: "@/theme/theme", message: "Use semantic NativeWind classes or the approved CSS-variable boundary hook." }],
        patterns: [{ group: ["nativewind"], importNames: ["useUnstableNativeVariable"], message: "Read CSS variables through @/lib/theme." }],
      }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/theme.ts", ...themeBoundaryFiles],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "@/theme/theme", message: "Use semantic NativeWind classes." },
          { name: "@/lib/theme", message: "Theme-variable hooks are reserved for native APIs that require raw values." },
        ],
        patterns: [{ group: ["nativewind"], importNames: ["useUnstableNativeVariable"], message: "Read CSS variables through @/lib/theme." }],
      }],
    },
  }
]);
