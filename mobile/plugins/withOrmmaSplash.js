const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Ormma splash: the app mark (assets/splash-icon.png) centred on the app's cream background.
 *
 * The generated android folder only has Expo's default white splash, and expo-splash-screen is not a
 * dependency, so this plugin writes the splash itself. It works for both the classic window-background
 * splash (Android 11 and older) and the system splash (Android 12 and newer), and it survives
 * `expo prebuild` because it runs as part of it.
 */
const BACKGROUND = "#F8F7F4";
const MARK_DP = 180;

module.exports = function withOrmmaSplash(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const res = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main", "res");
      const mark = path.join(projectRoot, "assets", "splash-icon.png");

      // Drop the default splash logos (any density) and install the mark once at xxhdpi.
      for (const dir of fs.readdirSync(res)) {
        if (dir.startsWith("drawable-")) {
          const old = path.join(res, dir, "splashscreen_logo.png");
          if (fs.existsSync(old)) fs.rmSync(old);
        }
      }
      fs.mkdirSync(path.join(res, "drawable-xxhdpi"), { recursive: true });
      fs.copyFileSync(mark, path.join(res, "drawable-xxhdpi", "ormma_splash_mark.png"));

      // Classic splash: the cream colour with the mark in the middle.
      fs.mkdirSync(path.join(res, "drawable"), { recursive: true });
      fs.writeFileSync(
        path.join(res, "drawable", "splashscreen_logo.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background" />
  <item android:width="${MARK_DP}dp" android:height="${MARK_DP}dp" android:gravity="center">
    <bitmap android:src="@drawable/ormma_splash_mark" android:gravity="fill" />
  </item>
</layer-list>
`,
      );

      // Android 12 and newer use the system splash: same colour and mark.
      const v31 = path.join(res, "values-v31");
      fs.mkdirSync(v31, { recursive: true });
      fs.writeFileSync(
        path.join(v31, "styles.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <style name="Theme.App.SplashScreen" parent="AppTheme">
    <item name="android:windowBackground">@color/splashscreen_background</item>
    <item name="android:windowSplashScreenBackground">@color/splashscreen_background</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/ormma_splash_mark</item>
  </style>
</resources>
`,
      );

      const colors = path.join(res, "values", "colors.xml");
      let xml = fs.readFileSync(colors, "utf8");
      xml = xml.replace(/(<color name="splashscreen_background">)[^<]*(<\/color>)/, `$1${BACKGROUND}$2`);
      fs.writeFileSync(colors, xml);
      return cfg;
    },
  ]);
};
