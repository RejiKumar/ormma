# Spec Delta

## Purpose

The family's Home feed needs a short factual record of what the parent said about her dose, without ever storing audio. The note is a server-written, schema-validated, family-language sentence on the dose event.

## ADDED Requirements

### Requirement: Reply structuring confirmation note rule
The prompt SHALL also govern `confirmationNote`: one short factual sentence in the family's language that paraphrases what the person said about the dose confirmation. No interpretation, advice, judgement or suggested medicine change; no detail that is not in the transcript. If the transcript says nothing about the dose, it is null.

#### Scenario: Note language and content
- **WHEN** the transcript contains a dose confirmation detail
- **THEN** `confirmationNote` is one sentence, in the family's language, paraphrasing only what was said
- **AND** it contains no advice, judgement or information absent from the transcript

## MODIFIED Requirements

### Requirement: Reply structuring output schema
The output schema SHALL be:

```
{
  "tookMedicine": true | false | null,
  "readings": [ { "type": "bp" | "sugar", "systolic"?: number, "diastolic"?: number, "value"?: number, "unit"?: string } ],
  "symptoms": string[],
  "confirmationNote": string | null,
  "urgent": boolean,
  "confidence": number (0 to 1),
  "language": string
}
```

#### Scenario: Output shape
- **WHEN** the model returns a response
- **THEN** it is JSON only and matches the schema above

#### Scenario: Note is null when nothing was said
- **WHEN** the transcript contains no detail about the dose confirmation
- **THEN** `confirmationNote` is `null`
- **AND** the dose status change still follows `tookMedicine` alone, unchanged
