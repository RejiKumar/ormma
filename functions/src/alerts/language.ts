// The language a family member's notifications are written in. It comes from `users/{uid}.language`
// (written by the member's own app). Missing or anything else means English, and every translated line
// falls back to its English text, so a gap can never leave a push empty.

export const MEMBER_LANGUAGES = ["en", "ml", "ta", "hi"] as const;
export type MemberLanguage = (typeof MEMBER_LANGUAGES)[number];

export const memberLanguage = (value: unknown): MemberLanguage =>
  typeof value === "string" && (MEMBER_LANGUAGES as readonly string[]).includes(value) ? (value as MemberLanguage) : "en";

/** A translation table: English is complete, every other language may be missing lines. */
export type LineTable<K extends string> = { en: Record<K, string> } & Record<
  Exclude<MemberLanguage, "en">,
  Partial<Record<K, string>>
>;

/** A translated line for the language, or the English line when that language has none. */
export function pick<K extends string>(table: LineTable<K>, language: MemberLanguage, key: K): string {
  return table[language][key] ?? table.en[key];
}

/** Replaces `{name}`-style placeholders. Unknown placeholders are left as they are. */
export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
