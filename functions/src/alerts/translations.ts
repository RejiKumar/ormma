import type { LineTable, MemberLanguage } from "./language";

// Fixed notification wording per language (missed-dose-alerts, evening-digest and medical-safety specs).
// Only the parent's name and local clock times are interpolated: never medicine names, doses, readings or
// transcripts in an alert. The wording is neutral: no advice, no judgement of a reading. The non-English
// lines are machine-drafted and must be reviewed by a fluent speaker (local-language-reminders task 4.1).

export type AlertKey =
  | "standard"
  | "group_not_all"
  | "system_failure"
  | "urgent"
  | "fallbackName"
  | "titleMissed"
  | "titleUrgent"
  | "titleOther"
  | "titleDigest";

export const ALERT_LINES: LineTable<AlertKey> = {
  en: {
    standard: "{name} has not confirmed the {clock} tablets. Last attempt at {last}. Please check.",
    group_not_all: "{name} did not confirm all of the {clock} tablets. Please follow up.",
    system_failure: "We could not complete the call to {name} about the {clock} tablets. Please check.",
    urgent: "{name} mentioned something urgent. Please call them now.",
    fallbackName: "The parent",
    titleMissed: "Missed dose",
    titleUrgent: "Urgent",
    titleOther: "Ormma alert",
    titleDigest: "Ormma update",
  },
  ml: {
    standard: "{name} {clock}-ലെ ഗുളികകൾ ഉറപ്പാക്കിയിട്ടില്ല. അവസാന ശ്രമം {last}-ന്. ദയവായി പരിശോധിക്കുക.",
    group_not_all: "{name} {clock}-ലെ എല്ലാ ഗുളികകളും ഉറപ്പാക്കിയിട്ടില്ല. ദയവായി വിവരം തിരക്കുക.",
    system_failure: "{clock}-ലെ ഗുളികകളെക്കുറിച്ച് {name}-നെ വിളിക്കുന്നത് പൂർത്തിയാക്കാനായില്ല. ദയവായി പരിശോധിക്കുക.",
    urgent: "{name} അടിയന്തരമായ എന്തോ പറഞ്ഞു. ദയവായി ഇപ്പോൾ തന്നെ വിളിക്കുക.",
    fallbackName: "രക്ഷിതാവ്",
    titleMissed: "മരുന്ന് കഴിച്ചില്ല",
    titleUrgent: "അടിയന്തരം",
    titleOther: "Ormma അറിയിപ്പ്",
    titleDigest: "Ormma വിവരം",
  },
  ta: {
    standard: "{name} {clock} மாத்திரைகளை உறுதிப்படுத்தவில்லை. கடைசி முயற்சி {last} மணிக்கு. தயவுசெய்து சரிபார்க்கவும்.",
    group_not_all: "{name} {clock} மாத்திரைகள் அனைத்தையும் உறுதிப்படுத்தவில்லை. தயவுசெய்து நலம் விசாரிக்கவும்.",
    system_failure: "{clock} மாத்திரைகள் குறித்து {name} ஐ அழைப்பதை முடிக்க முடியவில்லை. தயவுசெய்து சரிபார்க்கவும்.",
    urgent: "{name} அவசரமான ஒன்றைக் குறிப்பிட்டார். தயவுசெய்து இப்போதே அழைக்கவும்.",
    fallbackName: "பெற்றோர்",
    titleMissed: "மருந்து தவறியது",
    titleUrgent: "அவசரம்",
    titleOther: "Ormma அறிவிப்பு",
    titleDigest: "Ormma தகவல்",
  },
  hi: {
    standard: "{name} ने {clock} की गोलियों की पुष्टि नहीं की है। आखिरी कोशिश {last} पर हुई। कृपया देख लें।",
    group_not_all: "{name} ने {clock} की सभी गोलियों की पुष्टि नहीं की। कृपया हालचाल पूछ लें।",
    system_failure: "{clock} की गोलियों के बारे में {name} को कॉल पूरी नहीं हो सकी। कृपया देख लें।",
    urgent: "{name} ने कुछ ज़रूरी बात कही। कृपया अभी उन्हें कॉल करें।",
    fallbackName: "माता-पिता",
    titleMissed: "दवा छूट गई",
    titleUrgent: "ज़रूरी",
    titleOther: "Ormma सूचना",
    titleDigest: "Ormma अपडेट",
  },
};

export type DigestKey =
  | "header"
  | "onTrack"
  | "notConfirmedOne"
  | "notConfirmedMany"
  | "takenAt"
  | "next"
  | "nextNoMedicine"
  | "Morning"
  | "Afternoon"
  | "Evening"
  | "Night";

export const DIGEST_LINES: LineTable<DigestKey> = {
  en: {
    header: "Ormma update, {date}",
    onTrack: "{name} is on track: {taken} of {total} doses confirmed.",
    notConfirmedOne: "{name} has not confirmed {count} dose: {times}. Please check in.",
    notConfirmedMany: "{name} has not confirmed {count} doses: {times}. Please check in.",
    takenAt: "{period} dose taken at {time}.",
    next: "Next: {medicines} at {time}.",
    nextNoMedicine: "Next: at {time}.",
    Morning: "Morning",
    Afternoon: "Afternoon",
    Evening: "Evening",
    Night: "Night",
  },
  ml: {
    header: "Ormma വിവരം, {date}",
    onTrack: "{name} കൃത്യമായി പോകുന്നു: {total} ഡോസിൽ {taken} ഉറപ്പായി.",
    notConfirmedOne: "{name} {count} ഡോസ് ഉറപ്പാക്കിയിട്ടില്ല: {times}. ദയവായി വിവരം തിരക്കുക.",
    notConfirmedMany: "{name} {count} ഡോസുകൾ ഉറപ്പാക്കിയിട്ടില്ല: {times}. ദയവായി വിവരം തിരക്കുക.",
    takenAt: "{period} ഡോസ് {time}-ന് കഴിച്ചു.",
    next: "അടുത്തത്: {time}-ന് {medicines}.",
    nextNoMedicine: "അടുത്ത ഡോസ് {time}-ന്.",
    Morning: "രാവിലത്തെ",
    Afternoon: "ഉച്ചയ്ക്കത്തെ",
    Evening: "വൈകുന്നേരത്തെ",
    Night: "രാത്രിയിലെ",
  },
  ta: {
    header: "Ormma தகவல், {date}",
    onTrack: "{name} சரியாகப் பின்பற்றுகிறார்: {total} டோஸில் {taken} உறுதியானது.",
    notConfirmedOne: "{name} {count} டோஸை உறுதிப்படுத்தவில்லை: {times}. தயவுசெய்து நலம் விசாரிக்கவும்.",
    notConfirmedMany: "{name} {count} டோஸ்களை உறுதிப்படுத்தவில்லை: {times}. தயவுசெய்து நலம் விசாரிக்கவும்.",
    takenAt: "{period} டோஸ் {time} மணிக்கு எடுக்கப்பட்டது.",
    next: "அடுத்தது: {time} மணிக்கு {medicines}.",
    nextNoMedicine: "அடுத்த டோஸ் {time} மணிக்கு.",
    Morning: "காலை",
    Afternoon: "மதியம்",
    Evening: "மாலை",
    Night: "இரவு",
  },
  hi: {
    header: "Ormma अपडेट, {date}",
    onTrack: "{name} ठीक चल रहे हैं: {total} में से {taken} खुराक की पुष्टि हुई।",
    notConfirmedOne: "{name} ने {count} खुराक की पुष्टि नहीं की: {times}। कृपया हालचाल पूछ लें।",
    notConfirmedMany: "{name} ने {count} खुराकों की पुष्टि नहीं की: {times}। कृपया हालचाल पूछ लें।",
    takenAt: "{period} की खुराक {time} पर ली गई।",
    next: "अगला: {time} पर {medicines}।",
    nextNoMedicine: "अगली खुराक {time} पर।",
    Morning: "सुबह",
    Afternoon: "दोपहर",
    Evening: "शाम",
    Night: "रात",
  },
};

// Weekday and month names for the digest's date line ("सोम 19 नव").
export const WEEKDAY_NAMES: Record<MemberLanguage, readonly string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  ml: ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"],
  ta: ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
  hi: ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"],
};

export const MONTH_NAMES: Record<MemberLanguage, readonly string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ml: ["ജനു", "ഫെബ്രു", "മാർ", "ഏപ്രി", "മേയ്", "ജൂൺ", "ജൂലൈ", "ഓഗ", "സെപ്റ്റ", "ഒക്ടോ", "നവം", "ഡിസം"],
  ta: ["ஜன", "பிப்", "மார்", "ஏப்", "மே", "ஜூன்", "ஜூலை", "ஆக", "செப்", "அக்", "நவ", "டிச"],
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुला", "अग", "सित", "अक्तू", "नव", "दिस"],
};
