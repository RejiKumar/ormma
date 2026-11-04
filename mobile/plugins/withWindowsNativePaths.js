const { withAppBuildGradle, withSettingsGradle } = require("expo/config-plugins");

/**
 * Windows MAX_PATH workaround.
 *
 * CMake mirrors absolute source paths into its object directories, e.g.
 *
 *   .cxx/Debug/<hash>/arm64-v8a/CMakeFiles/react_codegen_x.dir/D_/RARK/AI_Native/.../x.cpp.o
 *
 * When the repo lives deep on disk (as it does under
 * "D:\RARK\AI Native\Projects\...") those paths exceed the 260 character Windows
 * limit and ninja fails with:
 *
 *   ninja: error: mkdir(...D_/RARK/...): No such file or directory
 *
 * The fix keeps every native build path short without moving the project:
 *
 *  - "D:\nm" is a junction to mobile/node_modules, and Gradle points the native
 *    module projects at it (settings.gradle), so their own CMake builds and codegen
 *    directories live on a short path.
 *  - The :app CMake staging directory is moved to "D:\a" (app/build.gradle).
 *  - React Native's generated autolinking file is rewritten to the "D:/nm" junction
 *    just before CMake runs (app/build.gradle).
 *
 * The junction is created by `npm run android:apk` (scripts/android-build.mjs) or
 * `node scripts/android-build.mjs --prepare`. Both paths are deliberately short;
 * lengthening them can reintroduce the 260 character failure.
 */

const SHORT_NODE_MODULES = "D:/nm";
const SHORT_APP_STAGING = "D:/a";
const MARKER = "// >>> ormma: Windows MAX_PATH workaround";

const settingsBlock = `${MARKER}
// mobile/node_modules is also reachable through the short junction "D:/nm"
// (created by scripts/android-build.mjs). Point the native module projects there so
// CMake and ninja only see short paths for their sources and build directories.
def ormmaShortNodeModulesDir = new File("${SHORT_NODE_MODULES}")
def ormmaLongNodeModulesDir = new File(settingsDir, "../node_modules").canonicalFile
def ormmaLongNodeModulesPath = ormmaLongNodeModulesDir.absolutePath + File.separator
settings.rootProject.children.each { ormmaDescriptor ->
  def ormmaProjectDir = ormmaDescriptor.projectDir?.absoluteFile
  if (ormmaProjectDir == null) return
  def ormmaProjectPath = ormmaProjectDir.absolutePath
  if (ormmaProjectPath.toLowerCase().startsWith(ormmaLongNodeModulesPath.toLowerCase())) {
    ormmaDescriptor.projectDir = new File(
      ormmaShortNodeModulesDir,
      ormmaProjectPath.substring(ormmaLongNodeModulesPath.length())
    )
  }
}
`;

const appGradleBlock = `${MARKER}
// Keep the app's CMake build tree on a short path. AGP appends the variant, hash and
// ABI, so this root must stay very short: "D:/a/Debug/<hash>/arm64-v8a".
android {
    externalNativeBuild {
        cmake {
            buildStagingDirectory file("${SHORT_APP_STAGING}")
        }
    }
}

// React Native generates app/build/generated/autolinking/src/main/jni with absolute
// paths into mobile/node_modules. Rewrite them to the short junction before both
// CMake configure and ninja run, so the mirrored object paths stay under MAX_PATH.
def ormmaShortNodeModules = "${SHORT_NODE_MODULES}"
tasks.configureEach { ormmaTask ->
    if (ormmaTask.name.startsWith("configureCMake") || ormmaTask.name.startsWith("buildCMake")) {
        ormmaTask.doFirst {
            def ormmaLongNodeModules = new File(rootProject.projectDir, "../node_modules")
                .canonicalPath
                .replace("\\\\", "/")
            def ormmaEscapedNodeModules = ormmaLongNodeModules.replace(" ", "\\\\ ")
            def ormmaGeneratedDir = new File(project.buildDir, "generated/autolinking/src/main/jni")
            if (ormmaGeneratedDir.isDirectory()) {
                ormmaGeneratedDir.eachFileRecurse { ormmaFile ->
                    if (ormmaFile.isFile()) {
                        def ormmaText = ormmaFile.getText("UTF-8")
                        if (ormmaText.contains(ormmaLongNodeModules) || ormmaText.contains(ormmaEscapedNodeModules)) {
                            ormmaFile.setText(
                                ormmaText.replace(ormmaEscapedNodeModules, ormmaShortNodeModules)
                                    .replace(ormmaLongNodeModules, ormmaShortNodeModules),
                                "UTF-8"
                            )
                        }
                    }
                }
            }
        }
    }
}
`;

function appendBlock(contents, block) {
  if (contents.includes(MARKER)) {
    return contents;
  }
  return `${contents.replace(/\s*$/, "")}\n\n${block}`;
}

module.exports = function withWindowsNativePaths(config) {
  // The workaround relies on Windows junctions and short absolute paths.
  if (process.platform !== "win32") {
    return config;
  }

  config = withSettingsGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = appendBlock(gradleConfig.modResults.contents, settingsBlock);
    return gradleConfig;
  });

  config = withAppBuildGradle(config, (gradleConfig) => {
    gradleConfig.modResults.contents = appendBlock(
      gradleConfig.modResults.contents,
      appGradleBlock,
    );
    return gradleConfig;
  });

  return config;
};
