# Spec Delta

## ADDED Requirements

### Requirement: Generated prompt audio
Synthesised prompt audio is not call audio and SHALL NOT be treated as a recording: it SHALL contain
only fixed template text plus the parent's name, live in a private Storage path, and be served only
through the token-checked playback endpoint. Call audio SHALL still be processed in memory only and
never stored.

#### Scenario: Prompt audio storage
- **WHEN** a prompt is synthesised
- **THEN** the object is private to the backend and reachable only through the authenticated endpoint

#### Scenario: No recording
- **WHEN** a call is handled
- **THEN** no audio of the parent's voice is stored, only pre-generated prompt audio may be cached

#### Scenario: URLs carry no health data
- **WHEN** a prompt or playback URL is built
- **THEN** it contains only the token and an opaque content hash
