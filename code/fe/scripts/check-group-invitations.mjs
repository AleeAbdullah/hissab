import assert from 'node:assert/strict';

import { groupInviteStatus } from '../src/features/groups/invitations.ts';

const member = (status) => ({ userId: 'person', status });
assert.equal(groupInviteStatus('person', [], []), undefined);
assert.equal(groupInviteStatus('person', [member('ACTIVE')], []), 'Member');
assert.equal(
  groupInviteStatus('person', [], [{ userId: 'person' }]),
  'Invited'
);
for (const status of ['LEFT', 'DECLINED', 'CANCELLED']) {
  assert.equal(groupInviteStatus('person', [member(status)], []), undefined);
  assert.equal(
    groupInviteStatus('person', [member(status)], [{ userId: 'person' }]),
    'Invited'
  );
}
assert.equal(
  groupInviteStatus('other', [member('ACTIVE')], [{ userId: 'person' }]),
  undefined
);
console.log('Group invitation eligibility checks passed.');
