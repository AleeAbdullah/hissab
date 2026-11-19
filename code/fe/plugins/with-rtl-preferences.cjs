const {
  AndroidConfig,
  withAndroidManifest,
  withInfoPlist,
  withStringsXml
} = require('expo/config-plugins');

// Preserve the app's saved direction instead of reapplying the device direction.
module.exports = function withRtlPreferences(config) {
  const keys = ['ExpoLocalization_supportsRTL', 'ExpoLocalization_forcesRTL'];
  for (const key of keys) delete config.ios?.infoPlist?.[key];
  config = withInfoPlist(config, (mod) => {
    for (const key of keys) delete mod.modResults[key];
    return mod;
  });
  config = withStringsXml(config, (mod) => {
    mod.modResults.resources.string = (
      mod.modResults.resources.string ?? []
    ).filter((item) => !keys.includes(item.$.name));
    return mod;
  });
  return withAndroidManifest(config, (mod) => {
    AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults).$[
      'android:supportsRtl'
    ] = 'true';
    return mod;
  });
};
