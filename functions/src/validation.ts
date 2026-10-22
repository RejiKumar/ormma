import { randomInt } from "node:crypto";
import type { Language, UserDoc } from "../../shared/types";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["ml-IN", "ta-IN", "hi-IN", "en-IN"];

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidE164(phone: unknown): phone is string {
  return typeof phone === "string" && E164_PATTERN.test(phone);
}

export function isSupportedLanguage(value: unknown): value is Language {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function isValidName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 100;
}

// Member display name: users/{uid} first, then the phone from the auth token, else empty.
export function resolveMemberDisplayName(
  user: Pick<UserDoc, "displayName" | "phone"> | undefined,
  tokenPhone: unknown,
): string {
  return user?.displayName?.trim() || user?.phone || (isValidE164(tokenPhone) ? tokenPhone : "");
}

// Unambiguous alphabet: no 0/O and no 1/I. 23 letters + 8 digits = 31 chars, ~40 bits at 8 chars.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 8;
export const DEFAULT_INVITE_TTL_DAYS = 7;
export const MAX_INVITE_TTL_DAYS = 7;

export type InviteRng = (max: number) => number;

export function generateInviteCode(rng: InviteRng = (max) => randomInt(max)): string {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_ALPHABET[rng(INVITE_CODE_ALPHABET.length)];
  }
  return code;
}
