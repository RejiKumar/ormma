const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Release signing for Play Store builds.
 *
 * The generated android/app/build.gradle signs the release build with the debug keystore. Play rejects
 * that, and shipping it would be a security problem, so this plugin adds a `release` signing config that
 * reads the upload key from, in order:
 *
 *   1. mobile/keystore.properties (git-ignored): storeFile, storePassword, keyAlias, keyPassword
 *   2. environment variables ORMMA_UPLOAD_STORE_FILE, ORMMA_UPLOAD_STORE_PASSWORD,
 *      ORMMA_UPLOAD_KEY_ALIAS, ORMMA_UPLOAD_KEY_PASSWORD
 *
 * and points the release build type at it. With neither present the release config has no store file,
 * so `bundleRelease` fails loudly instead of producing a debug-signed bundle. Debug builds are
 * unchanged. The edit is applied by `expo prebuild`, so it survives regenerating the android folder.
 */

const MARKER = "// >>> ormma: release signing";

const releaseSigningBlock = `        ${MARKER}
        release {
            def ormmaKeystoreProps = new Properties()
            def ormmaKeystoreFile = rootProject.file("../keystore.properties")
            if (ormmaKeystoreFile.exists()) {
                ormmaKeystoreFile.withInputStream { ormmaKeystoreProps.load(it) }
            }
            def ormmaProp = { String key, String env -> ormmaKeystoreProps.getProperty(key) ?: System.getenv(env) }
            def ormmaStoreFile = ormmaProp("storeFile", "ORMMA_UPLOAD_STORE_FILE")
            if (ormmaStoreFile) {
                storeFile new File(ormmaStoreFile).isAbsolute() ? new File(ormmaStoreFile) : rootProject.file("../" + ormmaStoreFile)
                storePassword ormmaProp("storePassword", "ORMMA_UPLOAD_STORE_PASSWORD")
                keyAlias ormmaProp("keyAlias", "ORMMA_UPLOAD_KEY_ALIAS")
                keyPassword ormmaProp("keyPassword", "ORMMA_UPLOAD_KEY_PASSWORD")
            }
        }
`;

function applyReleaseSigning(contents) {
  if (contents.includes(MARKER)) return contents;

  const signingConfigsStart = /signingConfigs\s*\{\r?\n/;
  if (!signingConfigsStart.test(contents)) {
    throw new Error("withReleaseSigning: could not find the signingConfigs block in app/build.gradle");
  }
  let out = contents.replace(signingConfigsStart, (match) => match + releaseSigningBlock);

  // Point the release build type (and only it) at the release signing config.
  const releaseBlock = /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
  if (!releaseBlock.test(out)) {
    throw new Error("withReleaseSigning: could not find the release build type signingConfig");
  }
  out = out.replace(releaseBlock, "$1signingConfig signingConfigs.release");
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = applyReleaseSigning(gradleConfig.modResults.contents);
    return gradleConfig;
  });
};

module.exports.applyReleaseSigning = applyReleaseSigning;
