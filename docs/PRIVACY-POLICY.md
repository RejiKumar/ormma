# Ormma privacy policy (draft for legal review)

Last updated: 2026-11-03. This is a draft. Have it reviewed before you publish it at the URL you give
Google Play, and keep it in step with the Data safety form in `docs/RELEASE.md`.

## What Ormma is

Ormma phones an elderly parent at medicine times, records whether the dose was taken, and shows the
result to family members in an app. Ormma records and relays. It does not give medical advice, diagnose,
or suggest a dose, a time or a medicine.

## What we collect

- **Family members:** phone number (for sign-in), display name, a push notification token, and the time
  you last opened the Today screen. Other members of the same parent can see your name and when you were
  last active. You may add your relationship to the parent and your city, and choose which notifications
  you receive (missed-dose alerts, the 8 PM summary, quiet hours). Other members also see when you have
  viewed a dose update ("Seen by"). We do not collect location.
- **The parent:** name, phone number, language, time zone, consent status, the medicines and dose times
  the family enters (including how the pill looks and what it is for), the parent's city, the prescriber's
  name and the refill date, whether each dose was taken, and a short note about the reply.
- **Calls:** we process the parent's spoken reply to understand it and do not keep the audio. Transcripts
  are kept only as needed to show the reply to the family.
- **Emergency contacts:** a name, a type (neighbour or clinic) and a phone number that an owner chooses to
  add, with an optional short note, so family members can call them if a dose is missed.
- **Family call log:** when a member taps "I called", we record who and when.

## How we use it

To place reminder calls, show the family how the day is going, alert the family when a dose is missed,
and keep the account secure. We do not sell data and do not show ads.

## Who can see it

Only members of that parent's family circle. If consent is withdrawn, members other than the owner stop
seeing information dated from that point on.

## Service providers

Google (Firebase, Speech-to-Text, Text-to-Speech), Exotel (phone calls), Anthropic (to structure a reply
into a status; calls are made from our servers and no phone number is sent) and Google Play. Data is
stored in Mumbai (asia-south1).

## Your choices

An owner can export a parent's data and delete a parent and its data from the Family tab. Deleting
removes the parent, medicines, dose history, alerts, family call log and emergency contacts. For anything
else, write to the contact address below.

## Security

Data is encrypted in transit. Access is limited by role (owner, editor, viewer) and checked on every
request. Secrets are kept in Secret Manager, never in the app.

## Children

Ormma is for adults. It is not directed at children.

## Contact

Add the support email and postal address here before publishing.
