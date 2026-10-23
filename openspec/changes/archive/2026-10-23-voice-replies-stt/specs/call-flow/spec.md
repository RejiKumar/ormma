# Spec Delta

## ADDED Requirements

### Requirement: Speech-to-text transcription
Voice replies SHALL be transcribed by Google Cloud Speech-to-Text using the parent's language code
and a phone-oriented short-utterance model (`telephony_short` for en-IN and hi-IN, `latest_short` for
ml-IN and ta-IN where telephony models are unavailable), with MP3 input at 8000 Hz. The result SHALL
include the transcript and a confidence value and SHALL exist only in memory.

#### Scenario: Usable voice answer
- **WHEN** a parent answers clearly in the configured language
- **THEN** the adapter returns the trimmed transcript and a confidence value
- **AND** the result is marked usable only when confidence is at least 0.6

#### Scenario: Multiple recognition results
- **WHEN** Google returns more than one result for the answer
- **THEN** the transcripts are joined and the lowest confidence is reported

### Requirement: Voice reply fallback
An empty transcript, silence, a missing confidence or a confidence below 0.6 SHALL be reported as
not usable, so the flow falls back to the DTMF prompt. A non-usable result SHALL NOT be guessed into
"taken" or "not taken".

#### Scenario: Low confidence or wrong language
- **WHEN** the parent speaks a different language and STT returns low confidence
- **THEN** the result is marked low confidence and the flow falls back to the DTMF prompt
- **AND** no dose status is derived from the transcript

#### Scenario: Long silence
- **WHEN** the recording contains no speech
- **THEN** the result is empty and the flow falls back to the DTMF prompt

### Requirement: Call audio stays in memory
Call audio SHALL be processed in memory only and SHALL NOT be stored in Storage or Firestore.
Transcripts and audio SHALL NOT appear in logs or error messages; only status and error codes MAY be
logged. Audio larger than the synchronous recognition limit SHALL be rejected before upload.

#### Scenario: Transcription failure
- **WHEN** the STT request fails or times out
- **THEN** an error with a code only is returned
- **AND** no audio or transcript is written or logged
