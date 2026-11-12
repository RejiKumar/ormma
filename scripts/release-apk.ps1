# Builds a small release APK for manual install and testing: 64-bit ARM only, signed with the upload key
# and the production Firebase config. For Play, upload the .aab from release-build.ps1 instead.
# Run from the repo root in your own PowerShell window:  .\scripts\release-apk.ps1
# Needs mobile\keystore.properties (your upload key) and mobile\google-services.prod.json.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$android = Join-Path $root "mobile\android"
$services = Join-Path $android "app\google-services.json"
$backup = Join-Path $android "app\google-services.dev.json"
$out = Join-Path $root "release"

Remove-Item Env:EXPO_PUBLIC_FIREBASE_EMULATOR_HOST -ErrorAction SilentlyContinue

Push-Location $root
npm run android:prepare
if ($LASTEXITCODE -ne 0) { throw "android:prepare failed" }
Pop-Location

if (-not (Test-Path $backup)) { Copy-Item $services $backup }
Copy-Item (Join-Path $root "mobile\google-services.prod.json") $services -Force

Push-Location $android
try {
  .\gradlew.bat --stop
  .\gradlew.bat :app:assembleRelease "-PreactNativeArchitectures=arm64-v8a"
  if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
  New-Item -ItemType Directory -Force $out | Out-Null
  $apk = Join-Path $android "app\build\outputs\apk\release\app-release.apk"
  $dest = Join-Path $out "ormma-arm64-release.apk"
  Copy-Item $apk $dest -Force
  Write-Host ""
  Write-Host ("APK OK: {0} ({1:N1} MB)" -f $dest, ((Get-Item $dest).Length / 1MB))
}
finally {
  Pop-Location
  if (Test-Path $backup) { Copy-Item $backup $services -Force }
}
