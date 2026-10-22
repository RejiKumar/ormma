import type { TFunction } from "i18next";

/** Map a Firebase Auth error to its catalogue message. Unknown errors fall back to a generic message. */
export function authErrorMessage(error: unknown, t: TFunction): string {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return t("auth.errors.tooManyRequests");
    case "auth/invalid-phone-number":
      return t("auth.errors.invalidPhone");
    case "auth/invalid-verification-code":
    case "auth/code-expired":
      return t("auth.errors.invalidCode");
    default:
      return t("auth.errors.generic");
  }
}
