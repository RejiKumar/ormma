// Phone helpers. Numbers are validated and stored in E.164 format (hard rule 7). Ormma is for India
// only in v1, so the app asks for the 10-digit mobile number and adds +91 itself.

/** Indian country code, shown as a fixed prefix and added when a number is stored. */
export const DEFAULT_COUNTRY_CODE = "+91";

/** Digits in an Indian mobile number without the country code. */
export const INDIA_MOBILE_DIGITS = 10;

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
// Indian mobile numbers start with 6, 7, 8 or 9.
const INDIA_MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function isValidE164(phone: string): boolean {
  return E164_PATTERN.test(phone);
}

/** True for exactly 10 digits that start with 6, 7, 8 or 9. */
export function isValidIndiaMobile(digits: string): boolean {
  return INDIA_MOBILE_PATTERN.test(digits);
}

/** "9876543210" becomes "+919876543210". */
export function toE164India(digits: string): string {
  return `${DEFAULT_COUNTRY_CODE}${digits}`;
}

/** "+919876543210" becomes "9876543210"; anything else is reduced to at most its last 10 digits. */
export function fromE164India(phone: string): string {
  if (phone.startsWith(DEFAULT_COUNTRY_CODE)) return phone.slice(DEFAULT_COUNTRY_CODE.length).replace(/\D/g, "");
  return phone.replace(/\D/g, "").slice(-INDIA_MOBILE_DIGITS);
}

/**
 * What the digits field holds after a change. Typing keeps only digits, up to 10. A paste or an
 * autofill (more than one character at once) also drops a leading +91, 91 or 0, so
 * "+91 98765 43210" and "098765 43210" both become 9876543210.
 */
export function nextIndiaDigits(previous: string, text: string): string {
  let digits = text.replace(/\D/g, "");
  const pasted = text.length - previous.length > 1;
  if (pasted) {
    if (digits.length > INDIA_MOBILE_DIGITS && digits.startsWith("91")) digits = digits.slice(2);
    else if (digits.length === INDIA_MOBILE_DIGITS + 1 && digits.startsWith("0")) digits = digits.slice(1);
  }
  return digits.slice(0, INDIA_MOBILE_DIGITS);
}
