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
    // All visible copy must come from typed translation keys.
    files: [
      'src/features/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/app/**/*.tsx'
    ],
    plugins: {
      i18n: {
        rules: {
          'no-jsx-copy': {
            meta: {
              type: 'problem',
              schema: [],
              messages: { raw: 'Use a typed translation key for visible copy.' }
            },
            create(context) {
              const report = (node) =>
                context.report({ node, messageId: 'raw' });
              const visibleProps = new Set([
                'title',
                'label',
                'placeholder',
                'accessibilityLabel',
                'accessibilityHint',
                'subtitle'
              ]);
              const inspect = (node) => {
                if (
                  node.type === 'Literal' &&
                  typeof node.value === 'string' &&
                  node.value.trim()
                )
                  report(node);
                if (
                  node.type === 'TemplateLiteral' &&
                  node.quasis.some((part) => part.value.raw.trim())
                )
                  report(node);
                if (node.type === 'ConditionalExpression') {
                  inspect(node.consequent);
                  inspect(node.alternate);
                }
                if (node.type === 'LogicalExpression') inspect(node.right);
                if (node.type === 'BinaryExpression') {
                  inspect(node.left);
                  inspect(node.right);
                }
              };
              return {
                JSXText(node) {
                  if (node.value.trim()) report(node);
                },
                JSXAttribute(node) {
                  if (
                    visibleProps.has(node.name.name) &&
                    node.value?.type === 'Literal' &&
                    typeof node.value.value === 'string'
                  )
                    report(node);
                },
                JSXExpressionContainer(node) {
                  if (
                    node.parent.type !== 'JSXAttribute' ||
                    visibleProps.has(node.parent.name.name)
                  )
                    inspect(node.expression);
                }
              };
            }
          }
        }
      }
    },
    rules: { 'i18n/no-jsx-copy': 'error' }
  },
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
