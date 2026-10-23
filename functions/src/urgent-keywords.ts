import type { Language } from "../../shared/types";

// Native-script and transliterated forms, because STT may return either. A human speaker of each
// language and a doctor/pharmacist must review this list before real-family rollout (launch gate).

export const URGENT_KEYWORDS: Record<Language, readonly string[]> = {
  "en-IN": [
    "chest pain",
    "chest tightness",
    "cant breathe",
    "can t breathe",
    "cannot breathe",
    "shortness of breath",
    "breathless",
    "not breathing",
    "fell down",
    "collapsed",
    "fainted",
    "unconscious",
    "passed out",
  ],
  "ml-IN": [
    "നെഞ്ചുവേദന",
    "നെഞ്ചിൽ വേദന",
    "ശ്വാസം മുട്ടുന്നു",
    "ശ്വാസമെടുക്കാൻ പറ്റുന്നില്ല",
    "ശ്വാസം",
    "വീണു",
    "ബോധക്ഷയം",
    "നെഞ്ച് വേദന",
    "nennu vedana",
    "nenju vedana",
    "shwasam muttunnu",
    "shwasam edukkan pattunnilla",
    "veenu",
    "behosh",
  ],
  "ta-IN": [
    "நெஞ்சு வலி",
    "மூச்சு விட முடியல",
    "மூச்சு",
    "விழுந்து",
    "மயக்கம்",
    "nenju vali",
    "nenjil vali",
    "moochu vidukka mudiyala",
    "moochu",
    "vizhunthu",
    "mayakkam",
  ],
  "hi-IN": [
    "सीने में दर्द",
    "सीने में तकलीफ",
    "सांस नहीं आ रही",
    "सांस लेने में दिक्कत",
    "गिर गया",
    "गिर गई",
    "बेहोश",
    "seene mein dard",
    "sine mein dard",
    "saans nahi aa rahi",
    "saans lene mein dikkat",
    "gir gaya",
    "gir gayi",
    "behosh",
  ],
};

function normalize(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Returns the first matching keyword, or null. The parent language is checked first and English is
 * always a safety net; matching uses whole words/phrases after normalising case and punctuation.
 */
export function findUrgentKeyword(text: string, language: Language): string | null {
  const haystack = ` ${normalize(text)} `;
  const keywords = [...URGENT_KEYWORDS[language]];
  if (language !== "en-IN") keywords.push(...URGENT_KEYWORDS["en-IN"]);

  for (const keyword of keywords) {
    const needle = normalize(keyword);
    if (needle.length > 0 && haystack.includes(` ${needle} `)) return keyword;
  }
  return null;
}
