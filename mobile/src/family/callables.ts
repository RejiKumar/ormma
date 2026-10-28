// Typed wrappers over the callable Cloud Functions (secrets never live here, only in functions/).
import { getApp } from "@react-native-firebase/app";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import type { Language, Role } from "../../../shared/types";

const REGION = "asia-south1";

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
  const callable = httpsCallable<Req, Res>(getFunctions(getApp(), REGION), name);
  return callable(payload).then((result) => result.data);
}

export function createParent(payload: CreateParentPayload): Promise<{ parentId: string }> {
  return invoke("createParent", payload);
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

export function exportParentData(payload: ParentScopedPayload): Promise<unknown> {
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
