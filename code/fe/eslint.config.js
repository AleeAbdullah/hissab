// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const themeBoundaryFiles = [
  'src/app/_layout.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/app/(tabs)/home/inbox.tsx',
  'src/components/ui/switch.tsx',
  'src/app/(tabs)/activity/index.tsx',
  'src/app/(tabs)/home/index.tsx',
  'src/features/personal/components/include-shared-switch.tsx',
  'src/features/personal/components/spending-chart.tsx',
  'src/features/personal/components/spending-donut.tsx',
  'src/components/date-field.tsx',
  'src/features/personal/components/transaction-filter-sheet.tsx'
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/api/generated/**']
  },
  {
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            ['builtin', 'external'],
            ['internal', 'parent', 'sibling', 'index']
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true }
        }
      ]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/theme.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['nativewind'],
              importNames: ['useUnstableNativeVariable'],
              message: 'Read CSS variables through @/lib/theme.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/theme.ts', ...themeBoundaryFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/theme',
              message:
                'Theme-variable hooks are reserved for native APIs that require raw values.'
            }
          ],
          patterns: [
            {
              group: ['nativewind'],
              importNames: ['useUnstableNativeVariable'],
              message: 'Read CSS variables through @/lib/theme.'
            }
          ]
        }
      ]
    }
  }
]);
