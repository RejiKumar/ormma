## MODIFIED Requirements

### Requirement: users document
The collection `users/{uid}` SHALL have these fields:
- displayName: string
- phone: string (E.164)
- fcmTokens: string[]
- createdAt: timestamp
- language: "en" | "ml" | "ta" | "hi" (optional; the language the member's app shows, used for their notifications; missing means English)

(Family members only. Parents do not have accounts in v1; they are reached by phone.)

#### Scenario: User document shape
- **WHEN** a family member's user document is created
- **THEN** it has displayName, phone in E.164 format, fcmTokens and createdAt
- **AND** it may have a language
- **AND** parents do not have accounts in v1
