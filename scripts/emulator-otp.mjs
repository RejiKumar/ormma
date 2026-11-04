#!/usr/bin/env node
// Prints the phone verification codes the Auth emulator has issued for the local project:
//   npm run emulators        (in one terminal)
//   npm run otp              (after tapping "Send code" in the app)
// The emulator does not send real SMS; this is the only way to read the code. Each new
// "Send code" (or "Resend code") adds an entry, and the newest one is valid.

const PROJECT = process.env.FIREBASE_PROJECT ?? "demo-ormma";
const HOST = process.env.AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const URL = `http://${HOST}/emulator/v1/projects/${PROJECT}/verificationCodes`;

function fail(message) {
  console.error(`otp: ${message}`);
  process.exit(1);
}

async function main() {
  let payload;
  try {
    const response = await fetch(URL);
    if (!response.ok) fail(`auth emulator returned HTTP ${response.status} for ${URL}`);
    payload = await response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("otp:")) throw error;
    fail(
      `cannot reach the Auth emulator at ${HOST}. Start it with "npm run emulators". ` +
        `(${error instanceof Error ? error.message : String(error)})`,
    );
  }

  const codes = payload?.verificationCodes ?? [];
  if (codes.length === 0) {
    fail('no codes issued yet. Tap "Send code" in the app, then run this again.');
  }

  for (const { phoneNumber, code } of codes) {
    console.log(`otp: ${phoneNumber} -> ${code}`);
  }
  console.log(
    `otp: ${codes.length} code(s) issued; use the last one for ${codes.at(-1).phoneNumber}.`,
  );
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
