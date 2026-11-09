import assert from 'node:assert/strict';

import { runSingleRefresh } from '../src/api/refresh-lock.ts';

let calls = 0;
const refresh = async () => {
  calls += 1;
  await Promise.resolve();
  return true;
};

assert.deepEqual(
  await Promise.all([runSingleRefresh(refresh), runSingleRefresh(refresh)]),
  [true, true]
);
assert.equal(calls, 1, 'concurrent 401s must share one refresh');
await runSingleRefresh(refresh);
assert.equal(calls, 2, 'a later expiry must be able to refresh again');

const { retryableSubmission } = await import(
  '../src/api/retryable-submission.ts'
);
let keyCount = 0;
const submit = retryableSubmission(() => `key-${++keyCount}`);
const fail = (status) => () => Promise.reject(Object.assign(new Error('x'), { status }));
const keys = [];
const record = (key) => {
  keys.push(key);
  return Promise.resolve(key);
};

await submit({ amount: '100' }, fail(undefined)).catch(() => {});
await submit({ amount: '100' }, record);
assert.equal(keys[0], 'key-1', 'a retry after an unknown outcome reuses the key');
await submit({ amount: '100' }, record);
assert.equal(keys[1], 'key-2', 'a new submission after success gets a new key');
await submit({ amount: '100' }, fail(409)).catch(() => {});
await submit({ amount: '100' }, record);
assert.equal(keys[2], 'key-4', 'a definite 4xx answer releases the key');
await submit({ amount: '100' }, fail(503)).catch(() => {});
await submit({ amount: '200' }, record);
assert.equal(keys[3], 'key-6', 'a changed body gets a new key');
