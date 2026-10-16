# Spec 02: Access Control and Firestore Rules

Principle: deny by default. A user sees a parent's data only if `parents/{parentId}/members/{uid}` exists.

## Roles
| Role | Read data | Edit medicines | Add/remove members | Delete parent |
|---|---|---|---|---|
| owner | yes | yes | yes | yes |
| editor | yes | yes | no | no |
| viewer | yes | no | no | no |

## Rules by path
- users/{uid}: read/write only by that uid.
- parents/{id}: read by members. Create by any signed-in user (creator becomes owner via a Cloud Function, not the client). Update by owner only, and the client may NOT modify `consent`.
- members: read by members. Writes only via Cloud Function (invite acceptance).
- medicines: read by members. Create/update by owner or editor. Client may not set `confirmedByHuman` to true on documents with source "prescription_scan" except through the review screen path (field set only when a human edits the doc; enforce with a rule that requires `request.auth.uid` to be an editor/owner).
- doseEvents: read by members. Client may update only `status` to "taken" or "not_taken" with resolvedBy "family" (plus the `resolvedAt` that goes with it). A client may change `missed` to "taken" (family override) but may never set "missed", and may never change `missedAt`, `attempts`, `alertSent`, `lastCallSid`, `groupConfirmed` or `resolvedBy` other than to "family". Everything else server-only.
- After consent is revoked (`consent.status == "revoked"`): non-owner members (editor, viewer) can read healthLogs and alerts only where `createdAt < consent.revokedAt`, and doseEvents only where `scheduledFor < consent.revokedAt`. Owners keep full read access. The check reads the parent doc with `get()`. Rules do not filter, so mobile queries must include the same `where` clause or they will be denied.
- healthLogs: read by members. Create by owner/editor with source "family". Server writes voice logs.
- callSessions, auditLogs: no client access at all.
- prescriptions: read by members; create by owner/editor; status changes to "confirmed" by owner/editor only.
- alerts: read by members; client may only append own uid to `readBy`.
- invites: no client access. Redeemed through a callable function.

## Storage rules
- `/prescriptions/{parentId}/*`: read/write only by owner/editor members. Max 10 MB, images only.
- `/transcripts/*`: no client access.

## Required tests (Firebase emulator)
1. Unauthenticated user cannot read anything.
2. Signed-in non-member cannot read a parent, its medicines, or its logs.
3. Viewer can read but cannot write medicines.
4. Editor can write medicines but cannot add members.
5. Client cannot write `consent`, `callSessions` or `auditLogs`.
6. Removed member loses access immediately.
7. Client cannot set a doseEvent status to "missed" or "taken" with resolvedBy "dtmf".
8. Client can change a `missed` doseEvent to "taken" with resolvedBy "family", but cannot change `missedAt`, and cannot move `taken` back to `missed`.
9. After revocation, an editor or viewer cannot read a healthLog, alert or doseEvent dated at or after `revokedAt`, can still read older ones, and the owner can read all.
10. Before revocation (status "granted" or "pending"), the visibility rule changes nothing for any member.
