// Typed wrappers over the callable Cloud Functions (secrets never live here, only in functions/).
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { Language, Role } from "../../../shared/types";
import { FUNCTIONS_REGION } from "../firebase/region";

export interface CreateParentPayload {
  name: string;
  phone: string;
  language: Language;
}

export interface CreateInvitePayload {
  parentId: string;
  role: Exclude<Role, "owner">;
}

export interface RedeemInvitePayload {
  code: string;
}

function invoke<Req, Res>(name: string, payload: Req): Promise<Res> {
  const fns = getFunctions(getApp(), FUNCTIONS_REGION);
  const callable = httpsCallable<Req, Res>(fns, name);
  return callable(payload).then((result) => result.data);
}

export function createParent(payload: CreateParentPayload): Promise<{ parentId: string }> {
  return invoke("createParent", payload);
}

/** Parent ids the signed-in member belongs to (rebuilds the device-local list after a reinstall). */
export function listMyParents(): Promise<{ parentIds: string[] }> {
  return invoke("listMyParents", {});
}

export function createInvite(
  payload: CreateInvitePayload,
): Promise<{ code: string; expiresAt: string }> {
  return invoke("createInvite", payload);
}

export function redeemInvite(
  payload: RedeemInvitePayload,
): Promise<{ parentId: string; role: Role }> {
  return invoke("redeemInvite", payload);
}

export interface ParentScopedPayload {
  parentId: string;
}

/** Shape returned by the owner-only exportParentData callable. */
export interface ParentExportData {
  parent: unknown;
  members: unknown[];
  medicines: unknown[];
  doseEvents: unknown[];
  healthLogs: unknown[];
  callSessions: unknown[];
  prescriptions: unknown[];
  alerts: unknown[];
  invites: unknown[];
}

export function exportParentData(payload: ParentScopedPayload): Promise<ParentExportData> {
  return invoke("exportParentData", payload);
}

export function deleteParent(payload: ParentScopedPayload): Promise<{ deleted: boolean }> {
  return invoke("deleteParent", payload);
}

export interface RevokeConsentPayload {
  parentId: string;
  method?: "family_attested";
}

export function revokeConsent(payload: RevokeConsentPayload): Promise<{ ok: boolean }> {
  return invoke("revokeConsent", payload);
}

export interface GrantConsentPayload {
  parentId: string;
  method?: "family_attested";
}

export function grantConsent(payload: GrantConsentPayload): Promise<{ ok: boolean }> {
  return invoke("grantConsent", payload);
}

/** One Ormma call attempt for a dose, as returned by the read-only escalation callable. */
export interface EscalationAttempt {
  ordinal: number;
  startedAtMs: number;
  outcome: "answered" | "no_answer" | "failed" | "calling";
}

export interface DoseEscalation {
  status: string;
  attempts: EscalationAttempt[];
  /** Attempts counted by the dispatcher that never produced a call session. */
  unplaced: number;
  alertAtMs: number | null;
}

export function getDoseEscalation(payload: {
  parentId: string;
  doseEventId: string;
}): Promise<DoseEscalation> {
  return invoke("getDoseEscalation", payload);
}

/** Records that the signed-in member opened Today; the server throttles it to once per 5 minutes. */
export function touchPresence(payload: ParentScopedPayload): Promise<{ updated: boolean }> {
  return invoke("touchPresence", payload);
}

/** Records the first time the signed-in member saw each event (read receipts). */
export function markDosesSeen(payload: { parentId: string; eventIds: string[] }): Promise<{ marked: number }> {
  return invoke("markDosesSeen", payload);
}

/** Updates the signed-in member's own relationship and city; an empty string clears a field. */
export function setMemberProfile(payload: {
  parentId: string;
  relationship?: string;
  city?: string;
}): Promise<{ ok: true }> {
  return invoke("setMemberProfile", payload);
}

/** Saves the signed-in member's own notification preferences. */
export function setNotifyPrefs(payload: {
  parentId: string;
  missed: boolean;
  summary: boolean;
  quiet: boolean;
}): Promise<{ ok: true }> {
  return invoke("setNotifyPrefs", payload);
}

export interface CallHistoryEntry {
  kind: "ormma" | "family";
  atMs: number;
  outcome?: "answered" | "no_answer" | "failed" | "calling";
  durationSec?: number;
  byUid?: string;
}

export function getCallHistory(payload: ParentScopedPayload): Promise<{ entries: CallHistoryEntry[] }> {
  return invoke("getCallHistory", payload);
}

/** Logs "I called <parent>" for the signed-in member (one entry per minute). */
export function logFamilyCall(payload: ParentScopedPayload): Promise<{ id: string }> {
  return invoke("logFamilyCall", payload);
}
