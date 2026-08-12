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
