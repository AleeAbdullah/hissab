import assert from 'node:assert/strict';

import { simplifyLedgerBalances } from '../src/features/balances/simplify.ts';

const member = (userId, netMinor) => ({
  userId,
  displayName: userId.toUpperCase(),
  netMinor
});

assert.deepEqual(simplifyLedgerBalances([member('a', '0')]), []);
assert.deepEqual(
  simplifyLedgerBalances([member('a', '-250'), member('b', '250')]),
  [
    {
      fromUserId: 'a',
      fromDisplayName: 'A',
      toUserId: 'b',
      toDisplayName: 'B',
      amountMinor: '250'
    }
  ]
);
assert.deepEqual(
  simplifyLedgerBalances([
    member('b', '-300'),
    member('a', '-300'),
    member('c', '400'),
    member('d', '200')
  ])?.map(({ fromUserId, toUserId, amountMinor }) => ({
    fromUserId,
    toUserId,
    amountMinor
  })),
  [
    { fromUserId: 'a', toUserId: 'c', amountMinor: '300' },
    { fromUserId: 'b', toUserId: 'c', amountMinor: '100' },
    { fromUserId: 'b', toUserId: 'd', amountMinor: '200' }
  ]
);
assert.equal(
  simplifyLedgerBalances([member('a', '-1'), member('b', '2')]),
  null
);
