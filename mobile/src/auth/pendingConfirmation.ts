import type { ConfirmationResult } from "@react-native-firebase/auth";

// The ConfirmationResult from signInWithPhoneNumber is not serialisable, so it cannot travel in
// navigation params. It lives here for the Login -> Otp hand-off and is cleared after a verified
// sign-in (or when a resend replaces it).
let confirmation: ConfirmationResult | null = null;

export function setPendingConfirmation(result: ConfirmationResult | null): void {
  confirmation = result;
}

export function getPendingConfirmation(): ConfirmationResult | null {
  return confirmation;
}
