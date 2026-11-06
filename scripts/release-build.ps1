# Builds the signed Play bundle (.aab) for production.
# Run from the repo root in your own PowerShell window:  .\scripts\release-build.ps1
# Needs mobile\keystore.properties (your upload key) and mobile\google-services.prod.json.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$android = Join-Path $root "mobile\android"
$services = Join-Path $android "app\google-services.json"
$backup = Join-Path $android "app\google-services.dev.json"

Remove-Item Env:EXPO_PUBLIC_FIREBASE_EMULATOR_HOST -ErrorAction SilentlyContinue

# Use the production Firebase config for this build, and put the test one back afterwards.
if (-not (Test-Path $backup)) { Copy-Item $services $backup }
Copy-Item (Join-Path $root "mobile\google-services.prod.json") $services -Force

Push-Location $android
try {
  .\gradlew.bat --stop
  .\gradlew.bat :app:bundleRelease
  if ($LASTEXITCODE -ne 0) { throw "Gradle failed with exit code $LASTEXITCODE" }
  Write-Host ""
  Write-Host "BUILD OK: $android\app\build\outputs\bundle\release\app-release.aab"
}
finally {
  Pop-Location
  if (Test-Path $backup) { Copy-Item $backup $services -Force }
}
