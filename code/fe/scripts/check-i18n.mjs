import { createInstance } from 'i18next';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../src/i18n/locales/', import.meta.url);
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
const namespaces = readdirSync(new URL('en/', root)).sort();
function flatten(value, prefix = '', result = {}) {
  for (const [key, item] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof item === 'string') result[path] = item;
    else {
      assert(item && typeof item === 'object' && !Array.isArray(item), path);
      flatten(item, path, result);
    }
  }
  return result;
}
const placeholders = (text) =>
  [
    ...new Set(
      [...text.matchAll(/{{\s*([\w]+)(?:\s*,[^}]*)?\s*}}/g)].map(
        (match) => match[1]
      )
    )
  ].sort();
function validate(source, target, locale) {
  assert.deepEqual(
    Object.keys(target).sort(),
    Object.keys(source).sort(),
    `${locale}: keys`
  );
  for (const key of Object.keys(source)) {
    assert(target[key].trim(), `${locale}:${key}: empty translation`);
    assert.deepEqual(
      placeholders(target[key]),
      placeholders(source[key]),
      `${locale}:${key}: placeholders`
    );
    const plural = key.match(/^(.*)_(zero|one|two|few|many|other)$/);
    if (plural) {
      assert(
        placeholders(target[key]).includes('count'),
        `${key}: plural requires count`
      );
      const categories = new Intl.PluralRules(locale).resolvedOptions()
        .pluralCategories;
      for (const category of categories)
        assert(
          `${plural[1]}_${category}` in target,
          `${locale}:${plural[1]} missing ${category}`
        );
    }
    assert(!/_(plural|\d+)$/.test(key), `${key}: use Intl plural suffixes`);
  }
}
assert.throws(() => validate({ a: '{{name}}' }, { a: '{{other}}' }, 'en'));
assert.throws(() => validate({ a: 'a' }, {}, 'en'));
assert.throws(() =>
  validate(
    { x_one: '{{count}}', x_other: '{{count}}' },
    { x_one: '{{count}}', x_other: '{{count}}' },
    'ar'
  )
);
for (const locale of locales) {
  assert.deepEqual(
    readdirSync(new URL(`${locale}/`, root)).sort(),
    namespaces,
    `${locale}: namespaces`
  );
  for (const namespace of namespaces) {
    const read = (language) =>
      flatten(
        JSON.parse(
          readFileSync(new URL(`${language}/${namespace}`, root), 'utf8')
        )
      );
    validate(read('en'), read(locale), `${locale}`);
  }
}
// Exercise exact money and locale mapping without importing native Expo modules.
let locale = 'en';
const mapping = {};
vm.runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../src/i18n/locale.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } }
  ).outputText,
  { exports: mapping }
);
assert.equal(mapping.deviceLocale(['ur-Latn-PK']), 'en');
assert.equal(mapping.deviceLocale(['ur-PK']), 'ur-PK');
assert.equal(mapping.deviceLocale(['en-PK']), 'en');
assert.equal(mapping.isLocale('en-PK'), false);
assert.equal(mapping.deviceLocale(['zh-Hant-TW']), 'en');
assert.equal(mapping.deviceLocale(['zh-Hant-TW', 'fr-FR']), 'fr');
assert.equal(mapping.deviceLocale(['zh-Hans-HK']), 'zh-Hans');
assert.equal(mapping.deviceLocale(['zh-Hant-CN', 'hi-IN']), 'hi');
assert.equal(mapping.deviceLocale(['zh-CN']), 'zh-Hans');
assert.equal(mapping.deviceLocale(['de-DE']), 'en');
assert.equal(mapping.intlTag('ur-Latn-PK'), 'en-PK-u-nu-latn-ca-gregory');
assert.equal(mapping.isRTL('ur-Latn-PK'), false);
assert.equal(mapping.isRTL('ur-PK'), true);
for (const [language, start, end] of [
  ['en', 'left', 'right'],
  ['ur-Latn-PK', 'left', 'right'],
  ['ar', 'right', 'left'],
  ['ur-PK', 'right', 'left']
]) {
  assert.equal(mapping.logicalTextAlign('start', language), start);
  assert.equal(mapping.logicalTextAlign('end', language), end);
}
const plurals = createInstance();
await plurals.init({
  lng: 'ar',
  initAsync: false,
  resources: {
    ar: {
      translation: Object.fromEntries(
        ['zero', 'one', 'two', 'few', 'many', 'other'].map((form) => [
          `items_${form}`,
          form
        ])
      )
    }
  }
});
assert.deepEqual(
  [0, 1, 2, 3, 11, 100].map((count) => plurals.t('items', { count })),
  ['zero', 'one', 'two', 'few', 'many', 'other']
);
const source = readFileSync(
  new URL('../src/lib/money.ts', import.meta.url),
  'utf8'
).replace(/import .* from '@\/i18n';/, '');
const compiledMoney = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
function loadMoney() {
  const exports = {};
  vm.runInNewContext(compiledMoney, {
    exports,
    intlLocale: () => mapping.intlTag(locale),
    Intl
  });
  return exports;
}
const exports = loadMoney();
assert.equal(exports.parseMinorAmount('١٢٫٣٤'), '1234');
assert.equal(exports.parseMinorAmount('۱۲،۳۴'), '1234');
assert.equal(exports.parseMinorAmount('1.234'), null);
assert.equal(exports.parseMinorAmount('-1'), null);
assert.equal(
  exports.formatMinorAmount('900719925474099312', 'USD'),
  '$9,007,199,254,740,993.12'
);
for (const tag of locales) {
  locale = tag;
  const rendered = exports.formatMinorAmount('-12345678', 'USD');
  assert.equal(rendered.replace(/\D/g, ''), '12345678');
  assert(!/[٠-٩۰-۹]/.test(rendered));
  const options = new Intl.DateTimeFormat(
    `${locale}-u-nu-latn-ca-gregory`
  ).resolvedOptions();
  assert.equal(options.calendar, 'gregory');
  assert.equal(options.numberingSystem, 'latn');
}
assert.equal(fileURLToPath(root).endsWith('/locales/'), true);

function checkGrouping(money) {
  locale = 'es';
  assert.equal(money.formatMinorAmount('123456', 'EUR'), '1234,56\u00a0€');
  assert.equal(money.formatMinorAmount('1234567', 'EUR'), '12.345,67\u00a0€');
  assert.equal(money.formatMinorAmount('-1', 'EUR'), '-0,01\u00a0€');
  locale = 'en';
  assert.equal(
    money.formatMinorAmount('900719925474099312', 'USD'),
    '$9,007,199,254,740,993.12'
  );
}
checkGrouping(exports);
await import('@formatjs/intl-numberformat/polyfill-force.js');
await import('@formatjs/intl-numberformat/locale-data/en.js');
await import('@formatjs/intl-numberformat/locale-data/es.js');
checkGrouping(loadMoney());
console.log(
  `i18n: ${locales.length} locales × ${namespaces.length} namespaces; keys, placeholders, plurals and exact money passed (Node Intl and bundled number polyfill).`
);
