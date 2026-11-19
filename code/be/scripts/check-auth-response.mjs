import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { AuthService } = require('../dist/modules/auth/auth.service');
const account = {
  id: 'qa',
  email: 'qa@example.invalid',
  displayName: 'QA',
  displayCurrency: 'PKR',
  locale: 'en',
  passwordHash: 'private-test-hash',
  status: 'ACTIVE',
};
const service = new AuthService(
  {},
  { insertRefreshSession: async () => {} },
  {},
  { generate: () => 'test-refresh', hash: () => 'test-hash' },
  { issue: async () => ({ token: 'test-access', expiresAt: new Date() }) },
  { execute: async () => ({ user: account }) },
  {},
  { getOrThrow: () => 3600 },
);
const expected = ['displayCurrency', 'displayName', 'email', 'id', 'locale'];
const issued = await service.issueSession({}, account, {});
assert.deepEqual(Object.keys(issued.user).sort(), expected);
// Old persisted idempotency replies may still contain credential lookup fields.
const replayed = await service.signIn(
  'test-key',
  { email: account.email, password: 'test-password-only' },
  {},
);
assert.deepEqual(Object.keys(replayed.user).sort(), expected);
assert.equal(replayed.user.id, account.id);
account.locale = 'en-PK';
const legacyRegistration = await service.register('test-key', {}, {});
assert.deepEqual(Object.keys(legacyRegistration.user).sort(), expected);
assert.equal(legacyRegistration.user.locale, 'en');
account.locale = undefined;
service.idempotency.execute = async () => ({
  ok: true,
  value: { user: account },
});
const legacyRefresh = await service.refresh(
  'test-key',
  { refreshToken: 'test-only' },
  {},
);
assert.deepEqual(Object.keys(legacyRefresh.user).sort(), expected);
assert.equal(legacyRefresh.user.locale, 'en');
console.log(
  'Auth response: fresh sessions and legacy sign-in replays expose only public user fields.',
);
