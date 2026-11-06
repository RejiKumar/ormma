# Deploying from GitHub

Two workflows, both started by hand (GitHub → **Actions** → pick the workflow → **Run workflow**). Both
refuse to run from any branch except `main`, because production is `main`.

| Workflow | File | What it does |
| --- | --- | --- |
| Deploy backend | `.github/workflows/deploy-backend.yml` | Typechecks and tests the functions, runs the Firestore and Storage rules tests, then deploys to `ormma-prod`. Choose what to deploy: everything, functions only, rules and indexes only, or hosting (legal pages) only. |
| Deploy frontend (Android release) | `.github/workflows/deploy-frontend.yml` | Raises the version, builds the signed `.aab`, saves it as a downloadable artifact, commits the new version to `main`, and can upload it to a Google Play track. |

## The version rises on every frontend run

`scripts/bump-version.mjs` runs first and edits `mobile/app.json`:

- `android.versionCode` goes up by 1 (Play rejects an upload whose number is not higher).
- the patch part of `version` goes up by 1 (`1.0.0` → `1.0.1`).

After a successful build the workflow commits that change to `main` (`chore: release 1.0.1 (versionCode 2)`),
so the repository always matches what was shipped. A failed build commits nothing. For a bigger step (for
example `1.1.0`), edit `version` in `mobile/app.json` by hand before running.

## Secrets to add (GitHub → Settings → Secrets and variables → Actions)

| Secret | Used by | What to put there |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | backend | The whole JSON key of a service account for `ormma-prod` (see below). |
| `GOOGLE_SERVICES_JSON_BASE64` | frontend | The production `google-services.json`, base64 encoded. |
| `UPLOAD_KEYSTORE_BASE64` | frontend | The upload key `ormma-upload.jks`, base64 encoded. |
| `UPLOAD_KEYSTORE_PASSWORD` | frontend | The keystore password. |
| `UPLOAD_KEY_ALIAS` | frontend | `ormma-upload` |
| `UPLOAD_KEY_PASSWORD` | frontend | The key password (the same as the keystore password if you pressed Enter). |
| `PLAY_SERVICE_ACCOUNT_JSON` | frontend, only when uploading to Play | The JSON key of the Play service account (`ormma-play-verifier`, or a second one with release rights). |

Base64 encode a file in PowerShell and copy the result into the secret:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("mobile\google-services.prod.json")) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\RARK\AI Native\Projects\Docs\Ormma\ormma-keys\ormma-upload.jks")) | Set-Clipboard
```

### The Firebase deploy service account

1. Google Cloud console → IAM → Service accounts (project `ormma-prod`) → create `github-deployer`.
2. Give it these roles: **Firebase Admin**, **Cloud Functions Admin**, **Service Account User**, **Cloud Build Editor**,
   **Artifact Registry Writer**, **Secret Manager Viewer**.
3. Keys → Add key → JSON. Paste the whole file into the `FIREBASE_SERVICE_ACCOUNT_JSON` secret, then delete
   the downloaded file.

## Things to know

- The first release of a new app must be uploaded by hand in the Play Console. After that, tick **Also upload
  the bundle to Google Play** and choose a track. Uploads go in as a **draft** release; you review and roll
  it out in the Play Console.
- If `main` is protected, the version commit is rejected. Allow the GitHub Actions bot to push, or turn the
  commit step into a pull request.
- Keep the upload key and its passwords out of the repository. The workflow writes them only on the runner
  and they are removed when it ends.
- Phone sign-in on real phones needs the SHA-1 and SHA-256 of the upload key and of the Play App Signing key
  in the Firebase console (`docs/RELEASE.md` section 1).
