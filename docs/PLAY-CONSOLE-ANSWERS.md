# Play Console answer sheet (Ormma 1.0.1)

Answers for the Play Console forms, in the order Play asks. They describe how the app works today. You make the declarations, so read each one. Keep them in step with [PRIVACY-POLICY.md](PRIVACY-POLICY.md) and [RELEASE.md](RELEASE.md). Start at <https://play.google.com/console>, choose your developer account, then Ormma.

## 1. Store settings and app access

- **App access:** all or some functionality is restricted. Add sign-in details: name `Reviewer account`; username is the Firebase test phone number; password is its fixed code (Firebase console, Authentication, Phone, Phone numbers for testing: <https://console.firebase.google.com/project/ormma-prod/authentication/providers>). Instructions: "Sign-in uses a phone number and a one-time code. Enter the phone number on the Sign in screen, tap Send code, then enter the code. No SMS is sent for this number. After signing in, the Family tab lets you add a parent. Use only sample details, not a real phone number. This app does not provide medical advice."
- **Ads:** No ads.
- **Privacy policy URL:** `https://ormma-prod.web.app/privacy`
- **Account deletion URL:** `https://ormma-prod.web.app/delete-account` (deploy hosting first: `firebase deploy --only hosting --project ormma-prod`)

## 2. Content rating (IARC questionnaire)

- Category: prefer "Utility, Productivity, Communication, or Other". If the form puts you under Social or Communication, choose **Communication** (family who already know each other, small groups).
- Shares precise location with other users: **No**.
- Purchase of digital goods: **Yes** (the Ormma Family subscription).
- Random or chance-based purchases (loot boxes and similar): **No**.
- Block, report or moderate users or user-generated content: **No** (there is no chat or public content).
- Interactions limited to invited friends only: **Yes** (circles are joined by an owner's invite code).
- Violence, sexual content, gambling, drugs, profanity: **No**.

## 3. Target audience and content

- Target age: **18 and over**. Not designed for children.
- Government app, news app, financial features: **No**.
- **Health apps declaration:** a medication-reminder and family care app. It is **not a medical device** and gives **no medical advice** (the disclaimer "This app does not provide medical advice." is on every screen).

## 4. Data safety

**Data collection and security**
- Collects or shares required user data types: **Yes**.
- All user data encrypted in transit: **Yes**.
- Account creation method: **Username and other authentication** (phone number and a one-time SMS code).
- Users can request data deletion: **Yes**. In the app: Family, Settings, Delete account; Delete parent; Export data. Web: `https://ormma-prod.web.app/delete-account`.

**Data types to tick** (leave everything else empty)

| Category | Type | Collected | Shared | Optional | Purpose |
| --- | --- | --- | --- | --- | --- |
| Personal info | Name | Yes | No | Required | App functionality, Account management |
| Personal info | User IDs | Yes | No | Required | App functionality, Account management |
| Personal info | Phone number | Yes | No | Required | App functionality, Account management |
| Personal info | Address (only if you count the city an owner types) | Yes | No | Optional | App functionality |
| Financial info | Purchase history | Yes | No | Optional | App functionality |
| Health and fitness | Health info | Yes | No | Required | App functionality |
| Photos and videos | Photos (a scanned prescription page) | Yes | No | Optional | App functionality |
| Audio files | Voice or sound recordings (the parent's spoken reply) | Yes, processed ephemerally | No | Required for the call | App functionality |
| Contacts | Contacts (emergency contacts an owner types in; the phone's address book is never read) | Yes | No | Optional | App functionality |
| App activity | App interactions (read receipts, last seen, dose confirmations) | Yes | No | Required | App functionality |
| App activity | Other user-generated content (names, notes) | Yes | No | Optional | App functionality |
| Device or other IDs | Device or other IDs (push token) | Yes | No | Required | App functionality |

Not collected: Location, Messages, Files and docs, Calendar, Web browsing, App info and performance (no analytics or crash reporting is in the app).

Providers that process data on our behalf (Google Cloud, the speech services, the AI service that reads a prescription page, Twilio or Exotel for calls) are processors, not "sharing". Describe them in the privacy policy. If analytics or crash reporting is ever added, this form changes.

## 5. Subscriptions (Monetize, Subscriptions)

- `ormma_family_monthly`, name "Ormma Family monthly", base plan `monthly` auto-renewing monthly, India price 299 INR.
- `ormma_family_yearly`, name "Ormma Family yearly", base plan `yearly` auto-renewing yearly, India price 2,999 INR.
- On each base plan add an offer: Free trial, 1 week, eligibility New customer acquisition, **tag `trial`**. Activate the plans and the offers.
- Real-time notifications topic: `projects/ormma-prod/topics/play-billing-events`, subscriptions and voided purchases only.
- Licence testers: Settings, License testing, add your Google account.

## 6. Store listing

- **App name:** Ormma
- **Short description (80 characters):** Medicine reminder calls for your parents, with the reply shown to the family.
- **Full description:**
  "Ormma phones your parent at medicine times, in their own language, and shows the reply to the family in the app.
  - Calls in Malayalam, Tamil, Hindi or English.
  - See each dose as taken, not taken or not confirmed.
  - Missed-dose alerts to the family, and an evening summary.
  - Add medicines by typing or by scanning the prescription. You confirm each medicine before it is scheduled.
  - A family circle with owners, editors and viewers.
  - Free plan with 1 parent and 2 members; Ormma Family adds up to 3 parents and 6 members per parent.
  Ormma records and relays. It does not give medical advice."
- **Graphics:** icon 512x512, feature graphic 1024x500, at least 2 phone screenshots (Today, Medicines, Alerts, Plans, Parent details).
- **Contact email, website:** the address in the privacy policy; website `https://ormma-prod.web.app`.

## 7. Releases

- Internal testing: upload `release/ormma-1.0.1-vc3.aab`, release name `1.0.1 (3)`, add yourself as a tester, copy the opt-in link.
- Closed testing: at least 12 testers opted in for 14 days (a personal account), then apply for production.
- After the first upload: add the Play app signing SHA-1 and SHA-256 to Firebase (<https://console.firebase.google.com/project/ormma-prod/settings/general>).
