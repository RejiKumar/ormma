# Rules test coverage

Which spec requirement each emulator test covers. Tests live in `functions/test/rules/` and run with `npm run test:rules` (Firestore and Storage emulators, project `demo-ormma`). `npm run test:rules:mutations` weakens one rule at a time and checks that the covering test fails (30 mutations).

Files: `numbered.test.ts` (Rules test 1 to 16 of the spec, by number), `paths.test.ts` (every path rule, refinements, list queries), `storage.test.ts` (Storage rules). Test names below are the `describe` or `it` titles.

## Numbered tests (requirement "Rules test suite")

| Test          | What it proves                                                                                                 | Requirements it covers                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Rules test 1  | Unauthenticated user cannot read anything                                                                      | Deny by default and membership                                                                 |
| Rules test 2  | Signed-in non-member (owner of another parent) cannot read the parent, medicines or logs                       | Deny by default and membership; medicines path rule; healthLogs path rule                      |
| Rules test 3  | Viewer reads but cannot write medicines                                                                        | Role permissions; medicines path rule                                                          |
| Rules test 4  | Editor writes medicines, cannot add members                                                                    | Role permissions; members path rule                                                            |
| Rules test 5  | Nobody writes consent, callSessions or auditLogs                                                               | parents path rule; callSessions and auditLogs path rule                                        |
| Rules test 6  | A removed member loses access immediately                                                                      | Deny by default and membership                                                                 |
| Rules test 7  | No client status "missed" or "taken" with resolvedBy "dtmf"                                                    | doseEvents client status update                                                                |
| Rules test 8  | Owner/editor override missed to taken (family, own uid); missedAt unchangeable; taken cannot go back to missed | doseEvents family override and forbidden fields; doseEvents client updates and terminal states |
| Rules test 9  | After revocation non-owners read nothing dated at or after revokedAt; older data and the owner are unaffected  | Consent visibility                                                                             |
| Rules test 10 | Granted or pending: the visibility rule changes nothing                                                        | Consent visibility                                                                             |
| Rules test 11 | A viewer cannot change any doseEvent                                                                           | doseEvents family override and forbidden fields                                                |
| Rules test 12 | resolvedByUid missing or different is denied                                                                   | doseEvents resolvedByUid on client updates                                                     |
| Rules test 13 | Re-grant: before T1 and from T2 visible, T1 up to T2 hidden, owner reads all                                   | Consent visibility                                                                             |
| Rules test 14 | Second revocation (first revokedAt kept, regrantedAt null): only data before T1 for non-owners                 | Second revocation fails closed; Fail-closed rationale                                          |
| Rules test 15 | A client cannot create a parent directly                                                                       | parents path rule                                                                              |
| Rules test 16 | A viewer cannot write confirmedByHuman true; owner/editor can                                                  | medicines path rule                                                                            |

## Every access-control requirement

| Requirement                                     | Tests                                                                                                                             |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Deny by default and membership                  | Rules test 1, 2, 6; paths: "Deny by default and membership" (3 tests)                                                             |
| Role permissions                                | Rules test 3, 4; paths: parents update (owner only), members, medicines                                                           |
| users path rule                                 | paths: "users path rule / users document shape"                                                                                   |
| parents path rule                               | Rules test 5, 15; paths: "parents path rule / parents client update fields"                                                       |
| members path rule                               | Rules test 4; paths: "members path rule"                                                                                          |
| medicines path rule                             | Rules test 3, 16; paths: "medicines path rule / medicines document shape"                                                         |
| doseEvents read                                 | Rules test 9, 10; paths: "doseEvents read..." members read                                                                        |
| doseEvents client status update                 | Rules test 7, 8; paths: taken/missed/non-terminal transitions                                                                     |
| doseEvents resolvedByUid on client updates      | Rules test 12                                                                                                                     |
| doseEvents family override and forbidden fields | Rules test 8, 11; paths: "clients cannot change server-only fields"                                                               |
| doseEvents everything else server-only          | paths: server-only fields, create and delete denied                                                                               |
| Consent visibility                              | Rules test 9, 10, 13; paths: "Visibility check mechanics (list queries)"                                                          |
| Second revocation fails closed                  | Rules test 14                                                                                                                     |
| Fail-closed rationale                           | Rules test 14; paths: parent without consent map fails closed                                                                     |
| Visibility check mechanics                      | paths: "Visibility check mechanics (list queries)" (3 tests: no filter before revocation, filter required after, re-grant ranges) |
| healthLogs path rule                            | paths: "healthLogs path rule / healthLogs client create shape"                                                                    |
| callSessions and auditLogs path rule            | Rules test 5; paths: "callSessions and auditLogs path rule / invites path rule"                                                   |
| prescriptions path rule                         | paths: "prescriptions path rule / prescriptions client create and update"                                                         |
| alerts path rule                                | paths: "alerts path rule" (2 tests)                                                                                               |
| invites path rule                               | paths: "callSessions and auditLogs path rule / invites path rule"                                                                 |
| Storage rules for prescriptions                 | storage: "Storage rules for prescriptions" (5 tests: roles, images only, 10 MB boundary, read and cross-parent, removed member)   |
| Storage rules for transcripts                   | storage: "Storage rules for transcripts and everything else" (2 tests)                                                            |
| Rules test suite                                | numbered.test.ts (16 tests)                                                                                                       |
| doseEvents client updates and terminal states   | paths: "doseEvents read / client updates and terminal states / client deletes"; Rules test 8                                      |
| healthLogs client create shape                  | paths: "healthLogs path rule / healthLogs client create shape" (backdated createdAt, extra field, update)                         |
| prescriptions client create and update          | paths: "prescriptions path rule / prescriptions client create and update"                                                         |
| parents client update fields                    | paths: "parents path rule / parents client update fields"                                                                         |
| medicines document shape                        | paths: "medicines path rule / medicines document shape"                                                                           |
| users document shape                            | paths: "users path rule / users document shape"                                                                                   |
| Client deletes denied                           | paths: "Client deletes denied" and the delete assertions in each path test                                                        |
| Rules coverage beyond the numbered tests        | this document and `paths.test.ts`, `storage.test.ts`                                                                              |

## Rules that cannot be enforced in rules alone

| Rule                                                                                                         | Why not in rules                                          | Where it is enforced                                                                  |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Parent and owner member created together; member add and remove                                              | Rules cannot make two writes atomic or run server logic   | Callable Cloud Functions (Stage 2, Stage 12)                                          |
| Last owner cannot leave or be removed; invite expiry, single use, 8-character code, cannot grant owner (#15) | Needs counts and server time across documents             | Callable functions (Stage 2)                                                          |
| An AI-extracted medicine is never scheduled without a human confirming it on screen                          | Rules see the writer, not the screen (decision #14)       | App review screen; the dispatcher re-checks `confirmedByHuman` and `active` (Stage 4) |
| Uploaded files really are images                                                                             | Storage rules only see the declared content type and size | Prescription function checks the file before it is sent to Claude (Stage 10)          |
| Recursive delete of a parent and its Storage files                                                           | Rules cannot delete                                       | Delete callable (Stage 12)                                                            |
| Quiet hours, retries, idempotent call handling                                                               | Time and state machine logic                              | Functions (Stage 4)                                                                   |
