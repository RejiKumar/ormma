// E.164 helpers. Phone numbers are validated and stored in E.164 format (hard rule 7).

/** Indian country code, prefilled in the phone field for v1. */
export const DEFAULT_COUNTRY_CODE = "+91";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidE164(phone: string): boolean {
  return E164_PATTERN.test(phone);
}
