import type { Language } from "../../../shared/types";

// The only spoken text in the product. Native speakers review this file; nothing else may be
// spoken. Templates interpolate just the parent's name, the time-of-day word and member names.
// `{{name}}` is the parent's name as entered by the family.

export type PromptKind =
  | "greeting"
  | "question_single"
  | "question_grouped"
  | "closing"
  | "consent";

export const PROMPT_KINDS: PromptKind[] = [
  "greeting",
  "question_single",
  "question_grouped",
  "closing",
  "consent",
];

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

type TimeOfDayWords = Record<TimeOfDay, string>;

export const TIME_OF_DAY_WORDS: Record<Language, TimeOfDayWords> = {
  "en-IN": { morning: "morning", afternoon: "afternoon", evening: "evening", night: "night" },
  "ml-IN": {
    morning: "രാവിലെ",
    afternoon: "ഉച്ചയ്ക്ക്",
    evening: "വൈകുന്നേരം",
    night: "രാത്രി",
  },
  "ta-IN": { morning: "காலை", afternoon: "மதியம்", evening: "மாலை", night: "இரவு" },
  "hi-IN": { morning: "सुबह", afternoon: "दोपहर", evening: "शाम", night: "रात" },
};

const TEMPLATES: Record<Language, Record<PromptKind, string>> = {
  "en-IN": {
    greeting: "Hello {{name}}, this is your {{timeOfDay}} medicine reminder.",
    question_single:
      "Did you take your tablet? Say yes or no, or press 1 for yes, 2 for no. Press 9 to stop reminders.",
    question_grouped:
      "Did you take ALL of your {{timeOfDay}} tablets? Press 1 for yes, all of them. Press 2 if you did not take all of them. Press 9 to stop reminders.",
    closing: "Thank you, {{name}}. Goodbye.",
    consent:
      "Hello {{name}}. Your family, {{members}}, will see your medicine reminders and whether you take them, so they can help you. This stays private to them. Press 1 to agree. Press 9 to stop reminders.",
  },
  "ml-IN": {
    greeting: "നമസ്കാരം {{name}}, ഇത് നിങ്ങളുടെ {{timeOfDay}} മരുന്നിന്റെ ഓർമ്മപ്പെടുത്തലാണ്.",
    question_single:
      "നിങ്ങൾ ഗുളിക കഴിച്ചോ? ഉണ്ടെങ്കിൽ അതെ എന്നോ 1 എന്നോ പറയുക. ഇല്ലെങ്കിൽ ഇല്ല എന്നോ 2 എന്നോ പറയുക. ഓർമ്മപ്പെടുത്തലുകൾ നിർത്താൻ 9 അമർത്തുക.",
    question_grouped:
      "നിങ്ങൾ {{timeOfDay}} ഗുളികകൾ എല്ലാം കഴിച്ചോ? എല്ലാം കഴിച്ചെങ്കിൽ 1 അമർത്തുക. എല്ലാം കഴിച്ചില്ലെങ്കിൽ 2 അമർത്തുക. ഓർമ്മപ്പെടുത്തലുകൾ നിർത്താൻ 9 അമർത്തുക.",
    closing: "നന്ദി, {{name}}. വിട.",
    consent:
      "നമസ്കാരം {{name}}. നിങ്ങളുടെ കുടുംബാംഗങ്ങളായ {{members}} നിങ്ങളുടെ മരുന്ന് ഓർമ്മപ്പെടുത്തലുകളും അവ കഴിച്ചോ എന്നതും കാണും, അവർക്ക് സഹായിക്കാൻ. ഇത് അവർക്ക് മാത്രമുള്ള സ്വകാര്യതയാണ്. സമ്മതിക്കാൻ 1 അമർത്തുക. ഓർമ്മപ്പെടുത്തലുകൾ നിർത്താൻ 9 അമർത്തുക.",
  },
  "ta-IN": {
    greeting: "வணக்கம் {{name}}, இது உங்கள் {{timeOfDay}} மருந்து நினைவூட்டல்.",
    question_single:
      "உங்கள் மாத்திரையை எடுத்துக்கொண்டீர்களா? ஆம் எனில் 1 அழுத்தவும், இல்லை எனில் 2 அழுத்தவும். நினைவூட்டல்களை நிறுத்த 9 அழுத்தவும்.",
    question_grouped:
      "உங்கள் {{timeOfDay}} மாத்திரைகள் அனைத்தையும் எடுத்துக்கொண்டீர்களா? அனைத்தும் எடுத்துக்கொண்டால் 1 அழுத்தவும். அனைத்தும் எடுத்துக்கொள்ளவில்லை எனில் 2 அழுத்தவும். நினைவூட்டல்களை நிறுத்த 9 அழுத்தவும்.",
    closing: "நன்றி, {{name}}. போய் வாருங்கள்.",
    consent:
      "வணக்கம் {{name}}. உங்கள் குடும்பத்தினர் {{members}} உங்கள் மருந்து நினைவூட்டல்களையும், அவற்றை எடுத்துக்கொண்டீர்களா என்பதையும் பார்ப்பார்கள், உங்களுக்கு உதவ. இது அவர்களுக்கு மட்டுமே தனிப்பட்டது. ஒப்புக்கொள்ள 1 அழுத்தவும். நினைவூட்டல்களை நிறுத்த 9 அழுத்தவும்.",
  },
  "hi-IN": {
    greeting: "नमस्ते {{name}}, यह आपकी {{timeOfDay}} दवा की याद है।",
    question_single:
      "क्या आपने अपनी गोली ली? हाँ के लिए 1 दबाएँ, नहीं के लिए 2 दबाएँ। याद दिलाना बंद करने के लिए 9 दबाएँ।",
    question_grouped:
      "क्या आपने अपनी {{timeOfDay}} की सभी गोलियाँ लीं? सभी ली हैं तो 1 दबाएँ। सभी नहीं लीं तो 2 दबाएँ। याद दिलाना बंद करने के लिए 9 दबाएँ।",
    closing: "धन्यवाद, {{name}}. नमस्ते।",
    consent:
      "नमस्ते {{name}}. आपके परिवार के {{members}} आपकी दवा की याद और आपने वह ली या नहीं, यह देखेंगे, ताकि वे मदद कर सकें. यह उन्हीं के लिए निजी है। सहमत होने के लिए 1 दबाएँ। याद दिलाना बंद करने के लिए 9 दबाएँ।",
  },
};

/** Local-hour buckets: 05–11 morning, 12–16 afternoon, 17–20 evening, else night. */
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 20) return "evening";
  return "night";
}

export function timeOfDayWord(language: Language, hour: number): string {
  return TIME_OF_DAY_WORDS[language][timeOfDay(hour)];
}

export interface TemplateValues {
  /** Parent's name, as the family entered it. */
  name?: string;
  /** Local hour 0–23 of the scheduled dose; defaults to 9 (morning). */
  hour?: number;
  /** Member names for the consent script, in the family's display order. */
  members?: string[];
}

export function buildScript(
  language: Language,
  kind: PromptKind,
  values: TemplateValues = {},
): string {
  const template = TEMPLATES[language][kind];
  const words: Record<string, string> = {
    name: values.name ?? "",
    timeOfDay: timeOfDayWord(language, values.hour ?? 9),
    members: (values.members ?? []).join(", "),
  };

  const text = template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => words[key] ?? "");
  if (/\{\{\w+\}\}/.test(text)) throw new Error("template_placeholder_unresolved");
  if (kind === "consent" && words.members.length === 0) throw new Error("template_members_missing");
  if (kind !== "question_single" && kind !== "question_grouped" && !words.name) {
    throw new Error("template_name_missing");
  }
  return text;
}
