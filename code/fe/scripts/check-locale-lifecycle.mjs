import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createInstance } from 'i18next';
import ts from 'typescript';

function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(
      readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX
        }
      }
    ).outputText,
    {
      exports,
      Date,
      Intl,
      __DEV__: true,
      process: { env: { EXPO_PUBLIC_API_URL: 'http://qa.invalid' } },
      require: (name) => {
        assert(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
        return modules[name];
      }
    }
  );
  return exports;
}
const mapping = load('i18n/locale.ts');

function boot(stored, nativeRTL, failAt, tags = ['en-US']) {
  let contents = stored;
  let reloads = 0;
  const api = load('i18n/index.ts', {
    './polyfills': {},
    './locale': mapping,
    './resources': {
      resources: Object.fromEntries(
        mapping.locales.map((locale) => [locale, { common: {} }])
      )
    },
    expo: {
      reloadAppAsync: async () => {
        reloads++;
      }
    },
    'expo-file-system': {
      Paths: { document: 'test' },
      File: class {
        textSync() {
          if (contents === null) throw new Error('Missing file');
          return contents;
        }
        create() {
          if (failAt === 'create') throw new Error('Storage unavailable');
          contents = '';
        }
        write(value) {
          if (failAt === 'write') throw new Error('Storage full');
          contents = value;
        }
      }
    },
    'expo-localization': {
      getLocales: () => tags.map((languageTag) => ({ languageTag }))
    },
    i18next: createInstance(),
    'react-i18next': { initReactI18next: { type: '3rdParty', init() {} } },
    'react-native': {
      I18nManager: { isRTL: nativeRTL, allowRTL() {}, forceRTL() {} }
    }
  });
  return { api, contents: () => contents, reloads: () => reloads };
}
const arabic = boot(JSON.stringify({ version: 1, locale: 'ar' }), false);
assert.equal(arabic.api.activeLocale(), 'ar');
assert.equal(JSON.parse(arabic.contents()).locale, 'ar');
assert.equal(arabic.reloads(), 1);
assert.equal(boot(arabic.contents(), false).reloads(), 0);
assert.equal(boot(arabic.contents(), true).api.activeLocale(), 'ar');
for (const operation of ['create', 'write']) {
  const unavailable = boot(
    JSON.stringify({ version: 1, locale: 'ar' }),
    false,
    operation
  );
  assert.equal(unavailable.api.activeLocale(), 'ar');
  assert.equal(unavailable.reloads(), 0);
}
assert.equal(
  boot(
    JSON.stringify({ version: 1, locale: 'en-PK' }),
    false
  ).api.activeLocale(),
  'en'
);
// A new device (or iOS per-app) language since the last launch wins and waits
// for the profile; an unchanged one keeps the explicit choice.
const deviceChanged = boot(
  JSON.stringify({ version: 1, locale: 'ar', device: 'fr' }),
  false
);
assert.equal(deviceChanged.api.activeLocale(), 'en');
assert.equal(deviceChanged.api.pendingDeviceLocale(), 'en');
await deviceChanged.api.syncLocale('ar');
assert.equal(JSON.parse(deviceChanged.contents()).locale, 'en');
deviceChanged.api.clearDeviceSync();
assert.equal(deviceChanged.api.pendingDeviceLocale(), null);
const sameDevice = boot(
  JSON.stringify({ version: 1, locale: 'ur-Latn-PK', device: 'en' }),
  false
);
assert.equal(sameDevice.api.activeLocale(), 'ur-Latn-PK');
assert.equal(sameDevice.api.pendingDeviceLocale(), null);
const firstRecord = boot(JSON.stringify({ version: 1, locale: 'es' }), false);
assert.equal(firstRecord.api.activeLocale(), 'es');
assert.equal(JSON.parse(firstRecord.contents()).device, 'en');
// Switching the phone to an unsupported language keeps the explicit choice;
// switching back to a supported one later still counts as a change.
const unsupported = boot(
  JSON.stringify({ version: 1, locale: 'es', device: 'fr' }),
  false,
  undefined,
  ['de-DE']
);
assert.equal(unsupported.api.activeLocale(), 'es');
assert.equal(unsupported.api.pendingDeviceLocale(), null);
const backToFrench = boot(unsupported.contents(), false, undefined, ['fr-FR']);
assert.equal(backToFrench.api.activeLocale(), 'fr');
assert.equal(backToFrench.api.pendingDeviceLocale(), 'fr');
const switched = boot(null, false);
await switched.api.setLocale('ar');
assert.equal(JSON.parse(switched.contents()).locale, 'ar');
assert.equal(switched.reloads(), 1);
const backgroundLocale = boot(null, false);
await backgroundLocale.api.syncLocale('ar');
assert.equal(backgroundLocale.api.activeLocale(), 'en');
assert.equal(backgroundLocale.reloads(), 0);
assert.equal(JSON.parse(backgroundLocale.contents()).locale, 'ar');
await backgroundLocale.api.syncLocale('en');
assert.equal(JSON.parse(backgroundLocale.contents()).locale, 'en');
assert.equal(backgroundLocale.reloads(), 0);

const flush = () => new Promise(setImmediate);
let tokens;
let storedTokens;
let release;
let credentialWrites;
let onProfile;
const original = {
  sessionId: 'session-a',
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  user: { id: 'qa', locale: 'en' }
};
const rotated = {
  ...original,
  accessToken: 'new-access',
  refreshToken: 'new-refresh'
};
const restoredLocales = [];
const restored = load('api/session-store.ts', {
  'expo-secure-store': { getItemAsync: async () => JSON.stringify(original) },
  '@/features/local-data/store': {},
  '@/i18n': {
    activeLocale: () => 'es',
    setLocale: async (locale) => {
      restoredLocales.push(locale);
    }
  },
  '@/i18n/locale': mapping
});
await restored.hydrateTokens();
assert.equal(restored.getTokens().refreshToken, original.refreshToken);
assert.equal(restoredLocales.length, 0);
const profile = { ...original.user, locale: 'es' };
const jsx = (type, props) => ({ type, props });
const modules = {
  react: {
    createContext: () => ({}),
    use() {},
    useEffect: (run) => run(),
    useState: (value) => [value, () => {}]
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': { View: 'View' },
  'react-i18next': {
    useTranslation: () => ({ t: (key) => key, i18n: { language: 'en' } })
  },
  '@/api/query-client': {
    queryClient: {
      cancelQueries: async () => {},
      invalidateQueries: async () => {},
      setQueryData() {},
      clear() {},
      getQueryCache: () => ({
        subscribe: (callback) => {
          onProfile = callback;
          return () => {};
        }
      })
    }
  },
  '@/api/session-store': {
    getTokens: () => tokens,
    getLoginVersion: () => 1,
    hydrateTokens: async () => {},
    subscribeTokens: () => () => {},
    setTokens: async (next) => {
      credentialWrites++;
      await new Promise((resolve) => {
        release = resolve;
      });
      tokens = storedTokens = next;
    }
  },
  '@/i18n': {
    activeLocale: () => 'en',
    setLocale: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    syncLocale: () =>
      new Promise((resolve) => {
        release = resolve;
      })
  },
  '@/i18n/locale': mapping,
  '@/components/ui/dialog': { useDialog: () => () => {} },
  '@/components/ui/text': { Text: 'Text' },
  '@/components/ui/select': Object.fromEntries(
    [
      'Select',
      'SelectContent',
      'SelectGroup',
      'SelectItem',
      'SelectTrigger',
      'SelectValue'
    ].map((key) => [key, key])
  ),
  '@/features/account/api': {
    profileQuery: { queryKey: ['profile'] },
    updateProfile: async () => profile
  }
};

// Settings shows the saved choice but can explicitly keep the currently active one.
{
  let updates = 0;
  const applied = [];
  const prompts = [];
  tokens = original;
  const { LocalePicker } = load(
    'features/account/components/locale-picker.tsx',
    {
      ...modules,
      '@/features/account/api': {
        profileQuery: { queryKey: ['profile'] },
        updateProfile: async ({ locale }) => {
          updates++;
          return { ...profile, locale };
        }
      },
      '@/components/ui/dialog': {
        useDialog:
          () =>
          (...args) =>
            prompts.push(args)
      },
      '@/i18n': {
        activeLocale: () => 'en',
        setLocale: async (locale) => applied.push(locale)
      }
    }
  );
  const select = (savedLocale) =>
    LocalePicker({ savedLocale });
  const remote = select('fr');
  assert.equal(remote.props.value.value, 'fr');
  remote.props.onValueChange({ value: 'en' });
  await flush();
  assert.equal(updates, 1);
  assert.equal(applied[0], 'en');
  select('en').props.onValueChange({ value: 'en' });
  assert.equal(updates, 1);
  select('ar').props.onValueChange({ value: 'fr' });
  await flush();
  assert.equal(prompts.length, 0);
  assert.equal(updates, 2);
  select('ar').props.onValueChange({ value: 'ar' });
  assert.equal(prompts.length, 1);
  assert.equal(updates, 2);
}

async function race(run) {
  tokens = storedTokens = original;
  credentialWrites = 0;
  release = undefined;
  run();
  await flush();
  assert.equal(typeof release, 'function');
  // Auth rotates while a slower language preference write is still pending.
  tokens = storedTokens = rotated;
  release();
  await flush();
  assert.equal(storedTokens.refreshToken, rotated.refreshToken);
  assert.equal(tokens.accessToken, rotated.accessToken);
  assert.equal(credentialWrites, 0);
}
await race(() => {
  const { LocalePicker } = load(
    'features/account/components/locale-picker.tsx',
    modules
  );
  LocalePicker({}).props.onValueChange({ value: 'es' });
});
await race(() => {
  const { SessionProvider } = load('features/auth/session.tsx', modules);
  SessionProvider({ children: null });
  onProfile({
    type: 'updated',
    action: { type: 'success', manual: false },
    query: { queryKey: ['profile'], state: { data: profile } }
  });
});

// Cached/manual profile data cannot replace the saved preference; server reads can.
{
  const app = boot(null, false);
  await app.api.setLocale('es');
  let onTokens;
  let invalidations = 0;
  tokens = original;
  const { SessionProvider } = load('features/auth/session.tsx', {
    ...modules,
    '@/i18n': app.api,
    '@/api/session-store': {
      ...modules['@/api/session-store'],
      subscribeTokens(callback) {
        onTokens = callback;
        return () => {};
      }
    },
    '@/api/query-client': {
      queryClient: {
        ...modules['@/api/query-client'].queryClient,
        invalidateQueries: async () => {
          invalidations++;
        }
      }
    }
  });
  SessionProvider({ children: null });
  const event = {
    type: 'updated',
    action: { type: 'success', manual: true },
    query: {
      queryKey: ['profile'],
      state: { data: { ...original.user, locale: 'ar' } }
    }
  };
  onProfile(event);
  assert.equal(JSON.parse(app.contents()).locale, 'es');
  onProfile({ ...event, action: { type: 'success', manual: false } });
  assert.equal(JSON.parse(app.contents()).locale, 'ar');
  assert.equal(app.api.activeLocale(), 'es');
  assert.equal(app.reloads(), 0);
  tokens = { ...rotated, user: { id: 'other-user', locale: 'en' } };
  onProfile({ ...event, action: { type: 'success', manual: false } });
  assert.equal(JSON.parse(app.contents()).locale, 'ar');
  onTokens();
  assert.equal(invalidations, 1);
}

// A profile response from an ended session must never populate the new account's cache.
let finishUpdate;
let cachedProfiles = 0;
let appliedLanguages = 0;
tokens = original;
const { LocalePicker: DelayedPicker } = load(
  'features/account/components/locale-picker.tsx',
  {
    ...modules,
    '@/features/account/api': {
      profileQuery: { queryKey: ['profile'] },
      updateProfile: () =>
        new Promise((resolve) => {
          finishUpdate = resolve;
        })
    },
    '@/api/query-client': {
      queryClient: {
        cancelQueries: async () => {},
        setQueryData: () => {
          cachedProfiles++;
        },
        invalidateQueries: async () => {}
      }
    },
    '@/i18n': {
      activeLocale: () => 'en',
      setLocale: async () => {
        appliedLanguages++;
      }
    }
  }
);
DelayedPicker({}).props.onValueChange({ value: 'es' });
await flush();
tokens = {
  ...rotated,
  sessionId: 'session-b',
  user: { id: 'other-user', locale: 'en' }
};
finishUpdate(profile);
await flush();
assert.equal(cachedProfiles, 0);
assert.equal(appliedLanguages, 0);

let registered;
const { register } = load('features/auth/api.ts', {
  ...modules,
  '@/api/session-store': {
    clearTokens: async () => 1,
    getLoginVersion: () => 1,
    setTokens: async () => true
  },
  'expo-device': { deviceName: 'QA' },
  'expo-localization': { getLocales: () => [{ languageTag: 'en-US' }] },
  '@/api/generated/sdk.gen': {
    authRegister: async ({ body }) => {
      registered = body;
      return original;
    }
  },
  '@/api/transport': {
    ApiError: Error,
    idempotencyKey: () => 'test-idempotency-key',
    publicRequest: (call) => call()
  },
  '@/features/account/push': {},
  '@/i18n': { activeLocale: () => 'ur-Latn-PK', i18n: { t: (key) => key } }
});
await register({
  email: 'qa@example.invalid',
  displayName: 'QA',
  password: 'test-password-only'
});
assert.equal(registered.locale, 'en');
await register({
  email: 'qa@example.invalid',
  displayName: 'QA',
  password: 'test-password-only',
  locale: 'ur-Latn-PK'
});
assert.equal(registered.locale, 'ur-Latn-PK');

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function sessionHarness(
  localeApi = {
    activeLocale: () => 'en',
    setLocale: async () => {},
    syncLocale: async () => {}
  }
) {
  let disk = JSON.stringify(original);
  let pause;
  let writeStarted;
  const store = load('api/session-store.ts', {
    'expo-secure-store': {
      getItemAsync: async () => disk,
      setItemAsync: async (_key, value) => {
        if (pause) {
          writeStarted.resolve();
          await pause.promise;
          pause = undefined;
        }
        disk = value;
      },
      deleteItemAsync: async () => {
        disk = null;
      }
    },
    '@/features/local-data/store': { clearLocalUserData() {} },
    '@/i18n': localeApi,
    '@/i18n/locale': mapping
  });
  await store.hydrateTokens();
  return {
    store,
    disk: () => disk,
    pauseWrite() {
      pause = deferred();
      writeStarted = deferred();
      return { started: writeStarted.promise, resume: () => pause.resolve() };
    }
  };
}

function transportFor(
  session,
  refresh = async () => {
    throw new Error('Unexpected refresh');
  }
) {
  return load('api/transport.ts', {
    'expo-constants': {},
    './error-message': { errorMessage: () => 'API failure' },
    './generated/client.gen': { client: { setConfig() {} } },
    './generated/sdk.gen': { authRefresh: refresh },
    './refresh-lock': load('api/refresh-lock.ts'),
    './session-store': session.store,
    '@/i18n': { i18n: { t: (key) => key } }
  });
}
const denied = {
  error: { message: 'Unauthorized' },
  response: { status: 401 }
};
const replacement = { ...rotated, user: { id: 'other-user', locale: 'en' } };

// A replayed auth response must not override a newer explicit language choice.
{
  const app = boot(null, false);
  await app.api.setLocale('es');
  const session = await sessionHarness(app.api);
  await session.store.setTokens(
    { ...rotated, user: { ...original.user, locale: 'ar' } },
    session.store.getLoginVersion()
  );
  assert.equal(app.api.activeLocale(), 'es');
  assert.equal(app.reloads(), 0);
  assert.equal(JSON.parse(app.contents()).locale, 'es');
  // A fresh profile read can save a remote preference for the next launch.
  await app.api.syncLocale('ar');
  assert.equal(app.api.activeLocale(), 'es');
  assert.equal(app.reloads(), 0);
  assert.equal(JSON.parse(app.contents()).locale, 'ar');
}

// A delayed 401 cannot replay under another login, even for the same user ID.
for (const user of [replacement.user, original.user]) {
  const session = await sessionHarness();
  const transport = transportFor(session);
  const network = deferred();
  let calls = 0;
  const pending = transport.request(() => {
    calls++;
    return network.promise;
  });
  const login = await session.store.clearTokens();
  await session.store.setTokens({ ...replacement, user }, login);
  network.resolve(denied);
  await assert.rejects(pending, /sessionChanged/);
  assert.equal(calls, 1);
  assert.equal(
    session.store.getTokens().refreshToken,
    replacement.refreshToken
  );
}

// A rotation within the original login remains eligible for one retry.
{
  const session = await sessionHarness();
  const transport = transportFor(session);
  const network = deferred();
  let calls = 0;
  const pending = transport.request(() =>
    ++calls === 1 ? network.promise : Promise.resolve({ data: 'ok' })
  );
  await session.store.setTokens(rotated, session.store.getLoginVersion());
  network.resolve(denied);
  assert.equal(await pending, 'ok');
  assert.equal(calls, 2);
}

// A late refresh response cannot restore the previous account.
{
  const session = await sessionHarness();
  const refresh = deferred();
  const started = deferred();
  const transport = transportFor(session, () => {
    started.resolve();
    return refresh.promise;
  });
  const pending = transport.request(async () => denied);
  await started.promise;
  const login = await session.store.clearTokens();
  await session.store.setTokens(replacement, login);
  refresh.resolve({ data: rotated, response: { status: 200 } });
  await assert.rejects(pending, /sessionChanged/);
  assert.equal(session.store.getTokens().user.id, replacement.user.id);
  assert.equal(JSON.parse(session.disk()).user.id, replacement.user.id);
}

// Sign-out also wins when the native credential write has already started.
{
  const session = await sessionHarness();
  const paused = session.pauseWrite();
  const writing = session.store.setTokens(
    rotated,
    session.store.getLoginVersion()
  );
  await paused.started;
  const signingOut = session.store.clearTokens();
  paused.resume();
  assert.equal(await writing, false);
  await signingOut;
  assert.equal(session.store.getTokens(), null);
  assert.equal(session.disk(), null);
}

// Normal refresh still persists the rotation before retrying.
{
  const session = await sessionHarness();
  const transport = transportFor(session, async () => ({
    data: rotated,
    response: { status: 200 }
  }));
  let calls = 0;
  assert.equal(
    await transport.request(async () =>
      ++calls === 1 ? denied : { data: 'refreshed' }
    ),
    'refreshed'
  );
  assert.equal(session.store.getTokens().refreshToken, rotated.refreshToken);
  assert.equal(JSON.parse(session.disk()).refreshToken, rotated.refreshToken);
}
// Exercise the installed Android adapter under both sides of UTC.
const nativePicker = load(
  '../node_modules/@expo/ui/src/community/datetime-picker/DateTimePicker.android.tsx',
  {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    './types': {
      buildChangeEvent: (date) => ({
        nativeEvent: { timestamp: date.getTime() }
      }),
      buildEvent: (date) => ({ nativeEvent: { timestamp: date.getTime() } })
    },
    '../../jetpack-compose/DatePicker': {
      DatePickerDialog: 'DateDialog',
      TimePickerDialog: 'TimeDialog',
      DateTimePicker: 'Inline'
    },
    '../../jetpack-compose/Host': { Host: 'Host' }
  }
);
const priorTimezone = process.env.TZ;
try {
  for (const timezone of [
    'America/New_York',
    'Asia/Karachi',
    'Pacific/Kiritimati'
  ]) {
    process.env.TZ = timezone;
    let selected;
    const value = new Date(2026, 10, 18, 12);
    const calendar = nativePicker.DateTimePicker({
      value,
      mode: 'date',
      locale: 'ar-u-nu-latn-ca-gregory',
      presentation: 'dialog',
      onValueChange: (_event, date) => {
        selected = date;
      }
    }).props.children;
    assert.equal(calendar.props.locale, 'ar-u-nu-latn-ca-gregory');
    assert.equal(calendar.props.initialDate, '2026-11-18T00:00:00.000Z');
    calendar.props.onDateSelected(new Date('2026-11-18T00:00:00.000Z'));
    assert.equal(selected.getFullYear(), 2026);
    assert.equal(selected.getMonth(), 10);
    assert.equal(selected.getDate(), 18);
    assert.equal(selected.getHours(), 12);
    const time = nativePicker.DateTimePicker({
      value,
      mode: 'time',
      onValueChange: (_event, date) => {
        selected = date;
      }
    }).props.children;
    const instant = new Date('2026-11-18T20:15:00.000Z');
    time.props.onDateSelected(instant);
    assert.equal(selected.getTime(), instant.getTime());
  }
} finally {
  if (priorTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = priorTimezone;
}
// For the recipient, actor and counterparty both identify the sender.
{
  const copy = createInstance();
  const activity = JSON.parse(
    readFileSync(
      new URL('../src/i18n/locales/en/activity.json', import.meta.url),
      'utf8'
    )
  );
  await copy.init({
    lng: 'en',
    initAsync: false,
    resources: { en: { activity } }
  });
  const { activityRow } = load('features/activity/presentation.ts', {
    '@/i18n': { i18n: copy, isolate: (value) => value },
    '@/lib/dates': {},
    '@/lib/money': {}
  });
  const sender = { userId: 'sender', displayName: 'Maya' };
  assert.equal(
    activityRow(
      {
        area: 'CONNECTION',
        eventType: 'CONNECTION_CREATED',
        actor: sender,
        counterparty: sender
      },
      'PKR',
      'recipient'
    ).title,
    'Maya sent you a friend request'
  );
}

console.log(
  'Locale lifecycle: login-bound retries, late refreshes, credential write order, RTL recovery and registration defaults passed (mocked native APIs).'
);
