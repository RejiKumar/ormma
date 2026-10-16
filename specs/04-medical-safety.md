# Spec 04: Medical Safety Rules

This app records and relays. It does not advise.

## Never
- Suggest, change, or comment on a dose, timing, or medicine choice.
- Say a reading is "normal", "safe", "dangerous", or diagnose a condition.
- Auto-schedule any medicine extracted from AI without a human confirming it on screen.
- Tell the parent anything medical during calls. Scripts are fixed templates only.
- Fill in a missing value (dose, time, name) from the model's own knowledge.

## Always
- Show AI-extracted data beside the source (photo or transcript snippet) for human confirmation.
- Mark uncertain extractions with low confidence and require explicit review.
- When a value looks implausible (e.g. BP 1500/90), flag needsReview instead of storing silently.
- Phrase trend notes factually: "BP readings this week were higher than last week." Add: "Please share with the doctor."
- Include a visible disclaimer: "This app does not provide medical advice."
- Provide a path for emergencies: if the parent says words indicating chest pain, breathlessness, fall, or unconsciousness, send an urgent alert to family immediately with the text "Amma mentioned something urgent. Please call her now." Do not attempt to assess it. The family app should show a prompt to call local emergency services. Maintain the keyword list per language in `functions/src/urgent-keywords.ts` and have a human who speaks each language review it.

## Trend flagging (v1, deterministic, no AI judgement)
- Compare 7-day average to previous 7-day average for BP and sugar.
- Flag if the increase is above a configurable percentage threshold. Thresholds are config, reviewed by a doctor advisor before launch.

## Review before launch
A doctor or pharmacist reads: call scripts, alert templates, trend wording, disclaimer, urgent-keyword list.
