# End-to-end test plan (Android release build, Appium)

Target: the signed release bundle (`com.ormma.app`) on the `flutter_emulator` AVD, against production
(`ormma-prod`) with the Firebase test number +917871458828. Calls stay disabled (`CALL_PROVIDER` unset).

Run: start Appium (`appium --port 4723`), then `cd e2e && npm install && node run.mjs`.
Set `ORMMA_TEST_CODE` to the fixed Firebase test code to enable the signed-in cases. On an Android 36 emulator set `ORMMA_SKIP_INIT=1` (the Appium Settings helper cannot start there). Use an emulator image with the Play Store: Google APIs images without it hang on sign-in.
Output: `e2e/report/report.html` (screenshots embedded) and `results.json`.

| ID   | Scenario | Expected |
| ---- | -------- | -------- |
| TC01 | Sign in after the intro | Sign in screen, phone field, Send code, medical-advice line |
| TC02 | Phone field | Fixed +91 prefix, empty 10-digit field |
| TC03 | Too-short number | "Enter a 10-digit mobile number.", stays on Sign in |
| TC04 | Valid test number | Reaches Enter the code (new API key accepted) |
| TC05 | Code screen | Shows the number and a resend control |
| TC06 | Wrong code | "That code is not correct…" message |
| TC07 | Empty code | Not accepted, stays on the code screen |
| TC08 | Correct code (needs code) | Signs in, leaves the code screen; on a fresh install the three welcome steps come first; an account with no parent shows Getting started, Add a parent and Invite family |
| TC09 | Tabs (needs code) | Each tab opens and shows content with no flicker |
| TC10 | Settings, plan, legal links (needs code) | Open; legal pages load from ormma-prod.web.app |
| TC11 | Restart (needs code) | Still signed in |
