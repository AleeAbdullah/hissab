import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createInstance } from 'i18next';
import ts from 'typescript';

const i18n = createInstance();
const locales = [
  'en',
  'ur-Latn-PK',
  'ur-PK',
  'ar',
  'es',
  'fr',
  'hi',
  'zh-Hans'
];
const resources = Object.fromEntries(
  locales.map((locale) => [
    locale,
    {
      common: JSON.parse(
        readFileSync(
          new URL(`../src/i18n/locales/${locale}/common.json`, import.meta.url),
          'utf8'
        )
      )
    }
  ])
);
await i18n.init({ lng: 'en', resources, initAsync: false });
const exports = {};
const source = readFileSync(
  new URL('../src/api/error-message.ts', import.meta.url),
  'utf8'
).replace("import { i18n } from '@/i18n';", '');
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText,
  { exports, i18n }
);
const { errorMessage } = exports;

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
assert.equal(errorMessage(undefined), resources.en.common.requestFailed);
for (const locale of locales) {
  await i18n.changeLanguage(locale);
  for (const [message, key] of [
    ['Minor-unit amount exceeds 64-bit range.', 'amountTooLarge'],
    [
      'A group invitation is already pending for this user.',
      'invitationPending'
    ]
  ]) {
    assert.equal(
      errorMessage({ error: { code: 'Bad Request', message } }),
      resources[locale].common.apiErrors[key]
    );
  }
  assert.equal(errorMessage(undefined), resources[locale].common.requestFailed);
  assert.equal(
    errorMessage({ message: '' }),
    resources[locale].common.requestFailed
  );
  assert.equal(
    errorMessage({
      error: {
        code: 'Unauthorized',
        message: 'Email or password is incorrect.'
      }
    }),
    resources[locale].common.apiErrors.invalidCredentials
  );
  assert.equal(
    errorMessage({
      error: { code: 'Conflict', message: 'Settlement version conflict.' }
    }),
    resources[locale].common.apiErrors.versionConflict
  );
  for (const message of [
    'All payers and participants must be active ledger members.',
    'Settlement parties must be active ledger members.'
  ])
    assert.equal(
      errorMessage({ error: { code: 'Bad Request', message } }),
      resources[locale].common.apiErrors.inactiveMembers
    );
  if (locale !== 'en') {
    assert.equal(
      errorMessage({
        error: { code: 'Forbidden', message: 'Unrecognized server wording.' }
      }),
      resources[locale].common.apiErrors.notAllowed
    );
    assert.equal(
      errorMessage('__proto__'),
      resources[locale].common.requestFailed
    );
  }
}
console.log(`API error assertions passed (${locales.length} locales).`);
