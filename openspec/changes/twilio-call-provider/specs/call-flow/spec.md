# Spec Delta

## MODIFIED Requirements

### Requirement: Dispatcher eligibility and provider boundary
The minute dispatcher SHALL claim and start calls only while calling is on, and only for due pending events that pass all gates:
the parent is active and its consent status is granted; the event has fewer than `1 + retryCount`
attempts; at least 10 minutes have passed since `lastCallAt`; the medicine is still active and
human-confirmed and still lists the event's local `HH:mm`; and the parent is not inside quiet hours.
Quiet hours SHALL defer, not mutate: the event stays pending and the first non-quiet run may claim
it. Claiming SHALL be transactional and all-or-nothing per group. Telephony SHALL be reached only
through a `CallProvider` interface. The provider SHALL be Exotel when `CALL_PROVIDER=exotel` and the Exotel configuration is complete, Twilio when `CALL_PROVIDER=twilio` and the Twilio configuration is complete, and the log-only
implementation only when `CALL_PROVIDER=log` (local, emulator and test runs). In any other state calling is off and the dispatcher SHALL claim nothing and place no call. Provider failures SHALL
return the claimed events to pending with attempts preserved and log error codes only.

#### Scenario: Due event inside quiet hours waits
- **WHEN** a pending event is due but the parent's local time is inside quiet hours
- **THEN** the event is neither claimed nor modified, and it is eligible again on the first run after quiet hours end

#### Scenario: Medicine was edited after generation
- **WHEN** an event is due but its medicine was deactivated, unconfirmed, or no longer lists that local time
- **THEN** the dispatcher skips that event without calling

#### Scenario: Attempt limit reached
- **WHEN** a pending event already has `attempts` equal to `1 + retryCount`
- **THEN** the dispatcher does not call it

#### Scenario: Claim is all-or-nothing
- **WHEN** two due events for the same parent and the same `scheduledFor` are claimed and one transaction read no longer sees one of them pending
- **THEN** neither event is claimed in that run

#### Scenario: Default provider does not dial
- **WHEN** the dispatcher runs without a complete real provider configuration and without `CALL_PROVIDER=log`
- **THEN** it claims no event, writes no fake callSid and places no call, and the run ends with a status code only

#### Scenario: Twilio selected
- **WHEN** `CALL_PROVIDER=twilio` and the Twilio configuration is complete
- **THEN** the dispatcher hands due groups to the Twilio provider and to no other provider

### Requirement: Exotel outbound call contract
The Exotel provider SHALL start a call by posting form-encoded values to
`/v1/Accounts/{account_sid}/Calls/connect` with Basic auth: `From` = the parent's E.164 number,
`CallerId` = the configured ExoPhone, `Url` = the configured call-flow URL, `CallType=trans`, a
`StatusCallback` pointing at `exotelWebhook?kind=status`, JSON terminal status events, and
`CustomField` = the parent id. Credentials and the flow URL SHALL come from Firebase secrets or
environment configuration, never source code, and logs SHALL contain ids and error codes only.

#### Scenario: Accepted call
- **WHEN** the dispatcher hands a group to the Exotel provider and Exotel accepts the request
- **THEN** the provider returns the `Call.Sid` from the response as the callSid

#### Scenario: Rejected call
- **WHEN** Exotel responds with a non-2xx status or a payload without `Call.Sid`
- **THEN** the provider throws a coded error, the dispatcher returns the group to pending, and only the code is logged

#### Scenario: Provider selection
- **WHEN** `CALL_PROVIDER=exotel`
- **THEN** the dispatcher uses Exotel and fails fast with a code-only configuration error if any required secret is missing
- **AND** only `CALL_PROVIDER=log` uses the logging provider, and `CALL_PROVIDER=twilio` uses Twilio

## ADDED Requirements

### Requirement: Twilio outbound call contract
The Twilio provider SHALL start a call by posting form-encoded values to
`/2010-04-01/Accounts/{account_sid}/Calls.json` with Basic auth (account sid and auth token): `To` = the parent's E.164 number,
`From` = the configured Twilio number, `Url` = the `twilioVoice` address for the greeting step (or the consent step) carrying the parent id, `Method=POST`, a
`StatusCallback` pointing at `twilioStatus` with the parent id and the events `initiated`, `ringing`, `answered` and `completed`, and a ring timeout. Credentials SHALL come from Firebase secrets, never source code, and logs SHALL contain ids and error codes only.

#### Scenario: Accepted call
- **WHEN** the dispatcher hands a group to the Twilio provider and Twilio accepts the request
- **THEN** the provider returns the call `sid` from the response as the callSid

#### Scenario: Rejected call
- **WHEN** Twilio responds with a non-2xx status or a payload without `sid`
- **THEN** the provider throws a coded error, the dispatcher returns the group to pending, and only the code is logged

#### Scenario: No number or secret in logs
- **WHEN** a call is started or fails
- **THEN** no phone number, token or account value appears in any log line

### Requirement: Twilio voice endpoint
A `twilioVoice` HTTPS function SHALL return TwiML for one step per request: greeting, question, gather, record, closing and consent. It SHALL play the same fixed spoken templates, in the parent's language, through the existing prompt and audio services, and SHALL follow the same consent rules. The question step SHALL offer a keypad gather that a key press interrupts, followed by a recording of at most 8 seconds when no key was pressed. The consent call SHALL have no recording step. The parent id and the step SHALL come from the callback address, not from the request body.

#### Scenario: Keypad answer
- **WHEN** a key is pressed during the question
- **THEN** the digit is applied through the existing provider-neutral logic and the closing is returned

#### Scenario: Spoken answer
- **WHEN** no key is pressed and the parent speaks
- **THEN** the recording is processed once per call within the 8 second budget and the closing is returned

#### Scenario: Reply not usable
- **WHEN** the spoken reply cannot be used
- **THEN** nothing is guessed, the question is asked once more with a keypad only, and then the closing is returned

#### Scenario: Consent call
- **WHEN** the step is consent
- **THEN** the consent greeting is played, only a keypad answer is accepted and nothing is recorded

### Requirement: Twilio request authenticity
Every request to `twilioVoice` and `twilioStatus` SHALL carry a valid `X-Twilio-Signature`, computed as the base64 HMAC-SHA1 of the full public URL followed by the POST parameters sorted by name, keyed by the Twilio auth token, and compared in constant time. The public URL SHALL be built from the configured `TWILIO_PUBLIC_BASE_URL`, not from request headers. A missing or invalid signature SHALL return 403 with a code only, before any Firestore read or write.

#### Scenario: Valid signature
- **WHEN** a request carries a signature computed from the configured URL and its parameters
- **THEN** it is processed

#### Scenario: Invalid or missing signature
- **WHEN** the signature is missing, wrong, or computed for different parameters
- **THEN** the function responds 403 and writes nothing

### Requirement: Twilio status mapping
The `twilioStatus` function SHALL map Twilio's `CallStatus` values onto the existing terminal session statuses with the existing classifier: `completed` when the call was answered, and the same outcomes as the Exotel callbacks for `busy`, `no-answer`, `failed` and `canceled`. It SHALL be idempotent per CallSid: the same callback twice leaves the same state, and a late or repeated callback SHALL NOT change a session that is already terminal.

#### Scenario: Answered and finished
- **WHEN** Twilio reports `completed` for a call that was answered
- **THEN** the session becomes completed once

#### Scenario: Not answered
- **WHEN** Twilio reports `no-answer` or `busy`
- **THEN** the session ends as not answered, and retries follow the existing call limits

#### Scenario: Repeated callback
- **WHEN** the same status callback arrives twice
- **THEN** the second changes nothing

### Requirement: Twilio recordings stay in memory and are deleted
When the spoken reply handler downloads a Twilio recording it SHALL add Basic auth only for Twilio's own API host, SHALL hold the audio in memory only, and SHALL delete the recording at Twilio after the reply has been processed, whether it was usable or not. The recording, its text and the model output SHALL NOT be stored or logged.

#### Scenario: Auth only for Twilio
- **WHEN** a recording URL is on Twilio's API host
- **THEN** the download carries Basic auth, and a recording URL on any other host never receives Twilio credentials

#### Scenario: Deleted after processing
- **WHEN** the reply has been processed
- **THEN** the recording is deleted at Twilio and nothing of it remains in our systems

#### Scenario: Delete fails
- **WHEN** deleting the recording at Twilio fails
- **THEN** only a status code is logged and the call outcome is unchanged
