import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Keep the existing pure checks independent of Expo storage and native reloads.
const translations = `
  import { createInstance } from ${JSON.stringify(import.meta.resolve('i18next'))};
  import common from ${JSON.stringify(new URL('../src/i18n/locales/en/common.json', import.meta.url).href)} with { type: 'json' };
  import personal from ${JSON.stringify(new URL('../src/i18n/locales/en/personal.json', import.meta.url).href)} with { type: 'json' };
  export const i18n = createInstance();
  i18n.init({ lng: 'en', initAsync: false, resources: { en: { common, personal } } });
  export const intlLocale = () => 'en-u-nu-latn-ca-gregory';
  export const isolate = (value) => value;
`;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/i18n')
      return {
        url: `data:text/javascript,${encodeURIComponent(translations)}`,
        shortCircuit: true
      };
    return nextResolve(
      specifier.startsWith('@/')
        ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
        : specifier,
      context
    );
  }
});

const {
  spendingAxisLabel,
  spendingPoints,
  spendingRange,
  spendingRatio,
  spendingSegments
} = await import('../src/features/personal/spending.ts');

assert.equal(spendingAxisLabel('2026-11', 'MONTH'), 'Nov');
assert.equal(spendingAxisLabel('2026-11-01', 'DAY'), 'Nov 1');

const now = new Date('2026-01-01T23:30:00-05:00');
assert.deepEqual(spendingRange('1M', now), {
  from: '2026-01-01T00:00:00.000Z',
  to: '2026-01-03T00:00:00.000Z'
});
assert.equal(spendingRange('1W', now).from, '2025-12-27T00:00:00.000Z');
assert.equal(spendingRange('6M', now).from, '2025-08-01T00:00:00.000Z');
assert.equal(spendingRange('1Y', now).from, '2025-02-01T00:00:00.000Z');
const range = spendingRange('1M', new Date('2024-02-29T12:00:00Z'));
const points = spendingPoints(
  [
    { period: '2024-02-01', expenseMinor: '9007199254740993' },
    { period: '2024-02-29', expenseMinor: '7' },
    { period: '2024-03-01', expenseMinor: '100' }
  ],
  range
);
assert.equal(points.length, 29);
assert.equal(points[1].amountMinor, '0');
assert.equal(points[1].totalMinor, '9007199254740993');
assert.equal(points.at(-1).totalMinor, '9007199254741000');
assert.equal(spendingPoints([], range).at(-1).totalMinor, '0');
assert.equal(spendingRatio('0', '0'), 0);
assert.equal(spendingRatio('9007199254741000', '9007199254741000'), 1);
assert.equal(spendingRatio('1', '4'), 0.25);
assert.deepEqual(spendingSegments([]), []);
assert.deepEqual(spendingSegments(['0']), [{ start: 0, fraction: 0 }]);
assert.deepEqual(spendingSegments(['1', '3']), [
  { start: 0, fraction: 0.25 },
  { start: 0.25, fraction: 0.75 }
]);
const segments = spendingSegments(['9007199254740993', '7', '100']);
assert.equal(segments.at(-1).start + segments.at(-1).fraction, 1);
console.log('Personal spending checks passed.');
