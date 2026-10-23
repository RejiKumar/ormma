import { findUrgentKeyword } from "./urgent-keywords";

describe("findUrgentKeyword", () => {
  it("matches English phrases regardless of case and punctuation", () => {
    expect(findUrgentKeyword("I have CHEST-PAIN since morning", "en-IN")).toBe("chest pain");
    expect(findUrgentKeyword("I cannot breathe properly", "en-IN")).toBe("cannot breathe");
    expect(findUrgentKeyword("she fell down in the bathroom", "en-IN")).toBe("fell down");
  });

  it("matches transliterated Malayalam, Tamil and Hindi", () => {
    expect(findUrgentKeyword("enikku nennu vedana undu", "ml-IN")).toBe("nennu vedana");
    expect(findUrgentKeyword("enakku nenju vali irukku", "ta-IN")).toBe("nenju vali");
    expect(findUrgentKeyword("seene mein dard ho raha hai", "hi-IN")).toBe("seene mein dard");
    expect(findUrgentKeyword("aval vizhunthu poyitru", "ta-IN")).toBe("vizhunthu");
    expect(findUrgentKeyword("woh behosh ho gayi", "hi-IN")).toBe("behosh");
  });

  it("matches native scripts", () => {
    expect(findUrgentKeyword("എനിക്ക് നെഞ്ചുവേദന ഉണ്ട്", "ml-IN")).toBe("നെഞ്ചുവേദന");
    expect(findUrgentKeyword("நெஞ்சு வலி இருக்கு", "ta-IN")).toBe("நெஞ்சு வலி");
    expect(findUrgentKeyword("मुझे सीने में दर्द है", "hi-IN")).toBe("सीने में दर्द");
  });

  it("keeps English as a safety net for every language", () => {
    expect(findUrgentKeyword("chest pain", "ml-IN")).toBe("chest pain");
    expect(findUrgentKeyword("I passed out", "ta-IN")).toBe("passed out");
  });

  it("does not match ordinary dose replies", () => {
    expect(findUrgentKeyword("I took my tablet after breakfast", "en-IN")).toBeNull();
    expect(findUrgentKeyword("I fell asleep after lunch", "en-IN")).toBeNull();
    expect(findUrgentKeyword("ഞാൻ മരുന്ന് കഴിച്ചു", "ml-IN")).toBeNull();
    expect(findUrgentKeyword("", "en-IN")).toBeNull();
  });
});
