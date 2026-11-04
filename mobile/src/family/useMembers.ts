// Members of one parent with the details the Family tab shows: profile, notification preferences and
// last seen. Members are readable by every member; they are written only by the callables.
import { collection, getFirestore, onSnapshot } from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import type { NotifyPrefs, Role } from "../../../shared/types";
import { timestampMs } from "./useParents";

export interface MemberInfo {
  uid: string;
  name: string;
  role: Role;
  relationship: string;
  city: string;
  /** Preferences with the defaults applied: missed on, summary on, quiet off. */
  notify: NotifyPrefs;
  lastSeenAt: number | null;
}

export const DEFAULT_NOTIFY: NotifyPrefs = { missed: true, summary: true, quiet: false };

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function toMember(uid: string, data: Record<string, unknown> | undefined): MemberInfo {
  const n = (data?.notify ?? {}) as Partial<NotifyPrefs>;
  const role = data?.role;
  return {
    uid,
    name: text(data?.displayName),
    role: role === "owner" || role === "editor" || role === "viewer" ? role : "viewer",
    relationship: text(data?.relationship),
    city: text(data?.city),
    notify: {
      missed: typeof n.missed === "boolean" ? n.missed : DEFAULT_NOTIFY.missed,
      summary: typeof n.summary === "boolean" ? n.summary : DEFAULT_NOTIFY.summary,
      quiet: typeof n.quiet === "boolean" ? n.quiet : DEFAULT_NOTIFY.quiet,
    },
    lastSeenAt: timestampMs(data?.lastSeenAt),
  };
}

export function useMembers(parentId: string | null): { members: MemberInfo[]; loading: boolean } {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(parentId !== null);

  useEffect(() => {
    if (!parentId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(getFirestore(), "parents", parentId, "members"),
      (snapshot) => {
        if (cancelled) return;
        const list = snapshot.docs.map((d) => toMember(d.id, d.data()));
        // Owner first (Primary), then by name.
        list.sort((a, b) => (a.role === "owner" ? -1 : 0) - (b.role === "owner" ? -1 : 0) || a.name.localeCompare(b.name));
        setMembers(list);
        setLoading(false);
      },
      (error) => {
        // Ids and statuses only in logs (hard rule 6).
        console.warn(`members snapshot failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
        if (!cancelled) setLoading(false);
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [parentId]);

  return { members, loading };
}
