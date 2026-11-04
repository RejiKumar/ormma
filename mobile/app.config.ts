// Dynamic Expo config: everything lives in app.json. The only addition is the iOS Firebase
// config, which is gitignored (see GoogleService-Info.plist.dist.example). Skipping it when the
// file is absent keeps `expo start` and Android builds working on a fresh clone without the plist.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const hasIosFirebase = existsSync(join(__dirname, "GoogleService-Info.plist"));
  const { googleServicesFile: _ignored, ...ios } = (config.ios ?? {}) as typeof config.ios & {
    googleServicesFile?: string;
  };
  return {
    ...config,
    name: config.name ?? "Ormma",
    slug: config.slug ?? "ormma",
    ios: hasIosFirebase ? { ...ios, googleServicesFile: "./GoogleService-Info.plist" } : ios,
  };
};
