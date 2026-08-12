import assert from 'node:assert/strict';

import { errorMessage } from '../src/api/error-message.ts';

assert.equal(
  errorMessage({ error: { message: 'Email is invalid.' } }),
  'Email is invalid.'
);
assert.equal(
  errorMessage({
    error: { message: ['Email is invalid.', 'Password is too short.'] }
  }),
  'Email is invalid.\nPassword is too short.'
);
assert.equal(errorMessage({ message: 'Legacy response.' }), 'Legacy response.');
assert.equal(
  errorMessage(undefined),
  'Something went wrong. Check your connection and try again.'
);
