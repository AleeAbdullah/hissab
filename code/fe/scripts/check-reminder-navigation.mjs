import assert from 'node:assert/strict';

import { reminderLedgerHref } from '../src/features/reminders/navigation.ts';

assert.deepEqual(
  reminderLedgerHref({
    eventType: 'reminder.created',
    ledgerId: 'group-id',
    ledgerType: 'GROUP'
  }),
  { pathname: '/groups/[groupId]', params: { groupId: 'group-id' } }
);
assert.deepEqual(
  reminderLedgerHref({
    actorUserId: 'friend-id',
    eventType: 'reminder.created',
    ledgerId: 'ledger-id',
    ledgerType: 'DIRECT'
  }),
  {
    pathname: '/groups/friends/[friendId]',
    params: { friendId: 'friend-id', ledgerId: 'ledger-id' }
  }
);
assert.equal(
  reminderLedgerHref({ eventType: 'expense.created', ledgerId: 'group-id' }),
  null
);
