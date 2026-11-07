import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url)));
assert.equal(eas.build.production.android.buildType, 'app-bundle');
assert.equal(eas.build.production.autoIncrement, true);
assert.equal(eas.submit.production.android.track, 'internal');

process.env.EAS_BUILD_PROFILE = 'production';
for (const [index, apiUrl] of [
  '',
  'http://api.example.com',
  'invalid'
].entries()) {
  process.env.EXPO_PUBLIC_API_URL = apiUrl;
  await assert.rejects(import(`../app.config.ts?invalid=${index}`));
}
process.env.EXPO_PUBLIC_API_URL = 'https://api.example.com';
const { default: config } = await import('../app.config.ts?valid');
assert.equal(config.android.package, 'com.alee.hissab');

const { outputText } = ts.transpileModule(
  readFileSync(
    new URL('../src/features/account/push.ts', import.meta.url),
    'utf8'
  ),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }
);
for (const [platform, physical, environment, projectId, expected] of [
  ['android', true, 'standalone', 'project-id', true],
  ['ios', true, 'standalone', 'project-id', true],
  ['android', true, 'bare', 'project-id', true],
  ['android', true, 'storeClient', 'project-id', false],
  ['ios', false, 'standalone', 'project-id', false],
  ['web', true, 'standalone', 'project-id', false],
  ['android', true, 'standalone', undefined, false]
]) {
  const exports = {};
  const modules = {
    'expo-constants': {
      __esModule: true,
      default: {
        executionEnvironment: environment,
        expoConfig: { extra: { eas: { projectId } } }
      },
      ExecutionEnvironment: { StoreClient: 'storeClient' }
    },
    'expo-device': { isDevice: physical },
    'expo-secure-store': {},
    'react-native': { Platform: { OS: platform } },
    './api': {}
  };
  runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    }
  });
  assert.equal(exports.canRegisterPushNotifications(), expected);
}
console.log('Release configuration and push availability checks passed.');
