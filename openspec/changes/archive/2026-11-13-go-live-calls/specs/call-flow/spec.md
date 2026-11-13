# Spec Delta

## ADDED Requirements

### Requirement: Spoken reply endpoint
An HTTPS endpoint SHALL receive the recording of the parent's spoken answer from Exotel. It SHALL be protected by the same shared-secret token check as the webhook and SHALL refuse every request when the token is not configured. It SHALL identify the call by its CallSid and the parent and doses by the custom field set when the call was placed, download the recording into memory, transcribe it, and pass the transcript to reply processing. It SHALL answer 200 when the reply was usable and applied or was already applied, and 422 when the reply was not usable, so the Exotel flow can play the keypad prompt. The whole step SHALL finish within 8 seconds or answer 422. Audio and transcripts SHALL NOT be stored or logged.

#### Scenario: Usable reply
- **WHEN** a valid callback carries a recording the parent answered clearly
- **THEN** the dose status is updated once and the endpoint answers 200

#### Scenario: Not usable
- **WHEN** the recording is silent, unclear or below the confidence threshold
- **THEN** no dose status changes and the endpoint answers 422

#### Scenario: Duplicate callback
- **WHEN** the same CallSid is delivered twice
- **THEN** the second delivery changes nothing and answers 200

#### Scenario: Wrong or missing token
- **WHEN** the token is wrong or missing
- **THEN** the request is refused and nothing is downloaded

#### Scenario: Download or recognition fails
- **WHEN** the recording cannot be downloaded or recognised in time
- **THEN** the endpoint answers 422 and logs an error code only

## MODIFIED Requirements

### Requirement: Dispatcher eligibility and provider boundary
The minute dispatcher SHALL claim and start calls only while calling is on, and only for due pending events that pass all gates:
the parent is active and its consent status is granted; the event has fewer than `1 + retryCount`
attempts; at least 10 minutes have passed since `lastCallAt`; the medicine is still active and
human-confirmed and still lists the event's local `HH:mm`; and the parent is not inside quiet hours.
Quiet hours SHALL defer, not mutate: the event stays pending and the first non-quiet run may claim
it. Claiming SHALL be transactional and all-or-nothing per group. Telephony SHALL be reached only
through a `CallProvider` interface. The provider SHALL be Exotel when `CALL_PROVIDER=exotel` and the Exotel configuration is complete, and the log-only
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
- **WHEN** the dispatcher runs without `CALL_PROVIDER=exotel` and without `CALL_PROVIDER=log`
- **THEN** it claims no event, writes no fake callSid and places no call, and the run ends with a status code only
