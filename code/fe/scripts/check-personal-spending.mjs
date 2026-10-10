import assert from 'node:assert/strict';
import {
  spendingPoints,
  spendingRange,
  spendingRatio,
  spendingSegments
} from '../src/features/personal/spending.ts';

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
