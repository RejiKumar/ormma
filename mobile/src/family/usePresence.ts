// Presence for one parent: who in the family was seen lately, and the latest family call.
// Presence is one timestamp per member (members/{uid}.lastSeenAt), written by the touchPresence
// callable, never by the client. It is shown only while consent is granted and never revoked, so the
// plain (unranged) queries below are always inside what the rules allow.
import {
  collection,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { touchPresence } from "./callables";
import type { FamilyParent } from "./useParents";
import { timestampMs } from "./useParents";

// Presence is stamped at most once a minute per parent, however often the screen re-mounts.
const TOUCH_INTERVAL_MS = 60_000;
const lastTouch = new Map<string, number>();

/** A member seen within this window counts as viewing now. */
export const VIEWING_WINDOW_MS = 2 * 60 * 1000;

export interface PresenceMember {
  uid: string;
  name: string;
  isSelf: boolean;
  lastSeenAt: number | null;
}

export interface PresenceState {
  members: PresenceMember[];
  /** Epoch ms of the newest family call, or null. */
  lastFamilyCallAt: number | null;
  /** False when presence must not be shown (consent not granted, or revoked at some point). */
  enabled: boolean;
}

const OFF: PresenceState = { members: [], lastFamilyCallAt: null, enabled: false };

export function presenceEnabled(parent: Pick<FamilyParent, "consent">): boolean {
  return parent.consent?.status === "granted" && parent.consent.revokedAt === null;
}

export function usePresence(parent: FamilyParent): PresenceState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const enabled = uid !== null && presenceEnabled(parent);
  const [members, setMembers] = useState<PresenceMember[]>([]);
  const [lastFamilyCallAt, setLast] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Fire and forget: presence must never block or fail the screen.
    const now = Date.now();
    if (now - (lastTouch.get(parent.id) ?? 0) < TOUCH_INTERVAL_MS) return;
    lastTouch.set(parent.id, now);
    void touchPresence({ parentId: parent.id }).catch(() => undefined);
  }, [enabled, parent.id]);

  useEffect(() => {
    if (!enabled) return;
    const db = getFirestore();
    const unsubMembers = onSnapshot(
      collection(db, "parents", parent.id, "members"),
      (snapshot) => {
        setMembers(
          snapshot.docs.map((d) => {
            const data = d.data() as { displayName?: unknown; lastSeenAt?: unknown };
            return {
              uid: d.id,
              name: typeof data.displayName === "string" ? data.displayName : "",
              isSelf: d.id === uid,
              lastSeenAt: timestampMs(data.lastSeenAt),
            };
          }),
        );
      },
      (error) => {
        // Ids and statuses only in logs (hard rule 6).
        console.warn(`presence members failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      },
    );
    const unsubCalls = onSnapshot(
      query(collection(db, "parents", parent.id, "familyCalls"), orderBy("at", "desc"), limit(1)),
      (snapshot) => {
        const first = snapshot.docs[0]?.data() as { at?: unknown } | undefined;
        setLast(timestampMs(first?.at));
      },
      (error) => {
        console.warn(`presence calls failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      },
    );
    return () => {
      unsubMembers();
      unsubCalls();
    };
  }, [enabled, parent.id, uid]);

  return enabled ? { members, lastFamilyCallAt, enabled } : OFF;
}

/** The other member to mention: someone viewing now, else the most recently seen. */
export function pickPresenceMember(
  members: PresenceMember[],
  now: number,
): { member: PresenceMember; viewing: boolean } | null {
  const others = members
    .filter((m) => !m.isSelf && m.lastSeenAt !== null)
    .sort((a, b) => (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0));
  const top = others[0];
  if (!top) return null;
  return { member: top, viewing: now - (top.lastSeenAt ?? 0) <= VIEWING_WINDOW_MS };
}

/** "5 min ago", "3 h ago", "2 days ago" as catalogue keys with a count. */
export function relativeAgo(now: number, then: number): { unit: "minutes" | "hours" | "days"; count: number } {
  const minutes = Math.max(1, Math.round((now - then) / 60000));
  if (minutes < 60) return { unit: "minutes", count: minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 48) return { unit: "hours", count: hours };
  return { unit: "days", count: Math.round(hours / 24) };
}
