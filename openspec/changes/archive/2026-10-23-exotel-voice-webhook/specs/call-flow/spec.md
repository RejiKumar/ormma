# Spec Delta

## ADDED Requirements

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
- **AND** with any other value the logging provider is used and nothing dials

### Requirement: DTMF answer mapping and revocation
The gather webhook SHALL trim surrounding quotes from `digits` and apply the first non-empty digit
to every member of the session: 1 resolves them as taken by DTMF with `groupConfirmed` true only for
grouped calls; 2 resolves them as not_taken with `groupConfirmed` and the one extra reminder after
`retryGapMinutes`; 9 revokes the parent's consent and stops calls; any other non-empty input marks
them unclear. Empty input SHALL change nothing.

#### Scenario: Press 1 on a grouped call
- **WHEN** the parent presses 1 on a grouped call
- **THEN** every member becomes taken with resolvedBy dtmf and groupConfirmed true

#### Scenario: Press 2 on a single call
- **WHEN** the parent presses 2 on a single-medicine call
- **THEN** the event becomes not_taken with groupConfirmed false and its reminder scheduled once

#### Scenario: Press 9
- **WHEN** the parent presses 9 during any call
- **THEN** the parent's consent becomes revoked, revoking stops further calls, and the current members leave the calling state

#### Scenario: Unrecognised key
- **WHEN** the parent presses any other key
- **THEN** the members become unclear and follow the retry path

### Requirement: callSessions created at call start
The dispatcher SHALL create exactly one `parents/{parentId}/callSessions/{callSid}` document after
the provider accepts a call, with the group's `doseEventIds`, status `initiated`, a null
`dtmfInput`, and `startedAt` set; every member SHALL receive the same `lastCallSid`.

#### Scenario: Session after acceptance
- **WHEN** the provider returns a callSid
- **THEN** the session exists with that id and lists every claimed event id

## MODIFIED Requirements

### Requirement: Webhook authenticity
The following SHALL hold:
- Validate webhook authenticity (shared secret or Exotel signature mechanism; confirm in Exotel docs).

Exotel does not document a callback signature, so the webhook SHALL require an unguessable shared
secret as a query parameter on both the status and gather URLs and compare it in constant time. A
missing or wrong token SHALL return 401 before any Firestore read or write. Other malformed input
SHALL return 400 with a code only.

#### Scenario: Webhook validation
- **WHEN** a webhook request arrives
- **THEN** its authenticity is validated by the shared secret token before any Firestore access

#### Scenario: Invalid token
- **WHEN** the token is missing or does not match the secret
- **THEN** the function responds 401 and writes nothing

### Requirement: Idempotent webhook handlers
The following SHALL hold:
- Webhook handlers must be idempotent: duplicate callbacks for the same callSid must not create duplicate logs or alerts.

Idempotency SHALL be session-scoped: a gather callback SHALL be ignored once the session has a
non-null `dtmfInput`, and a status callback SHALL be ignored once the session is terminal
(`completed`, `failed` or `no_answer`). Ignored callbacks return 200 with an `ignored` code and
write nothing.

#### Scenario: Duplicate callback
- **WHEN** a duplicate callback arrives for the same callSid
- **THEN** no duplicate logs or alerts are created

#### Scenario: Duplicate DTMF
- **WHEN** a second gather callback arrives for a session that already has a dtmfInput
- **THEN** the session and its events are unchanged

#### Scenario: Late terminal callback
- **WHEN** a terminal status callback arrives for a session that is already terminal
- **THEN** the session and its events are unchanged

### Requirement: Dispatcher eligibility and provider boundary
The minute dispatcher SHALL claim and start calls only for due pending events that pass all gates:
the parent is active and its consent status is granted; the event has fewer than `1 + retryCount`
attempts; at least 10 minutes have passed since `lastCallAt`; the medicine is still active and
human-confirmed and still lists the event's local `HH:mm`; and the parent is not inside quiet hours.
Quiet hours SHALL defer, not mutate: the event stays pending and the first non-quiet run may claim
it. Claiming SHALL be transactional and all-or-nothing per group. Telephony SHALL be reached only
through a `CallProvider` interface. The provider SHALL be Exotel when `CALL_PROVIDER=exotel` and the
log-only implementation otherwise (the default for local and emulator runs). Provider failures SHALL
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
- **WHEN** the dispatcher runs without `CALL_PROVIDER=exotel`
- **THEN** it writes a fake callSid on the claimed events and logs only parent/event ids and statuses, with no real call placed
