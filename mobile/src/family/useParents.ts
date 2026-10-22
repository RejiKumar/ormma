// Realtime parents list for the signed-in member (decision #57): rules deny unfiltered parents
// queries, so we subscribe only to the ids this device knows, in `in` chunks of at most 30.
// The member's own role per parent comes from parents/{parentId}/members/{uid}.
import { collection, documentId, getDoc, onSnapshot, query, where } from "@react-native-firebase/firestore";
import { getFirestore, doc } from "@react-native-firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ConsentStatus, Language, Role } from "../../../shared/types";
import { useAuth } from "../auth/AuthProvider";
import { readParentIds } from "./parentIds";

/** Firestore `in` clauses accept at most 30 values. */
const CHUNK_SIZE = 30;

export interface FamilyParent {
  id: string;
  name: string;
  language: Language;
  consentStatus: ConsentStatus;
  /** The signed-in member's role for this parent; null when the membership doc is unreadable. */
  role: Role | null;
}

export interface UseParentsResult {
  parents: FamilyParent[];
  /** True while the id list or the first snapshot is still loading. */
  loading: boolean;
  /** Re-read the stored ids and re-subscribe (called when the list screen gains focus). */
  reload: () => void;
}

interface ParentSnapshot {
  id: string;
  name: string;
  language: Language;
  consentStatus: ConsentStatus;
}

function toSnapshot(id: string, data: Record<string, unknown> | undefined): ParentSnapshot {
  const consent = (data?.consent ?? {}) as { status?: ConsentStatus };
  return {
    id,
    name: typeof data?.name === "string" ? data.name : "",
    language: (typeof data?.language === "string" ? data.language : "en-IN") as Language,
    consentStatus: consent.status ?? "pending",
  };
}

/** Ordered by the stored id list, de-duplicated, with the freshest data and roles. */
function merge(existing: FamilyParent[], incoming: FamilyParent[], order: string[]): FamilyParent[] {
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const parent of incoming) byId.set(parent.id, parent);
  return order
    .map((id) => byId.get(id))
    .filter((parent): parent is FamilyParent => parent !== undefined);
}

export function useParents(): UseParentsResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [parents, setParents] = useState<FamilyParent[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const orderRef = useRef<string[]>([]);

  useEffect(() => {
    if (!uid) {
      orderRef.current = [];
      setParents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    setLoading(true);
    orderRef.current = [];

    const readRoles = async (snapshots: ParentSnapshot[]): Promise<void> => {
      const db = getFirestore();
      const withRoles = await Promise.all(
        snapshots.map(async (snap): Promise<FamilyParent> => {
          try {
            const memberSnap = await getDoc(doc(db, "parents", snap.id, "members", uid));
            const role = memberSnap.exists()
              ? ((memberSnap.data() as { role?: Role }).role ?? null)
              : null;
            return { ...snap, role };
          } catch {
            return { ...snap, role: null };
          }
        }),
      );
      if (cancelled) return;
      setParents((previous) => merge(previous, withRoles, orderRef.current));
    };

    void (async () => {
      const ids = await readParentIds();
      if (cancelled) return;
      orderRef.current = ids;
      if (ids.length === 0) {
        setParents([]);
        setLoading(false);
        return;
      }
      const db = getFirestore();
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += CHUNK_SIZE) chunks.push(ids.slice(i, i + CHUNK_SIZE));
      let pendingFirstSnapshots = chunks.length;
      for (const chunk of chunks) {
        const parentsQuery = query(collection(db, "parents"), where(documentId(), "in", chunk));
        const unsubscribe = onSnapshot(
          parentsQuery,
          (snapshot) => {
            const snapshots = snapshot.docs.map((d) => toSnapshot(d.id, d.data()));
            void readRoles(snapshots);
            if (pendingFirstSnapshots > 0) {
              pendingFirstSnapshots -= 1;
              if (pendingFirstSnapshots === 0 && !cancelled) setLoading(false);
            }
          },
          (error) => {
            // Ids and statuses only in logs (hard rule 6).
            const code = (error as { code?: string } | null)?.code ?? "unknown";
            console.warn(`parents snapshot failed code=${code}`);
            if (pendingFirstSnapshots > 0) {
              pendingFirstSnapshots -= 1;
              if (pendingFirstSnapshots === 0 && !cancelled) setLoading(false);
            }
          },
        );
        unsubscribers.push(unsubscribe);
      }
    })();

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [uid, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { parents, loading, reload };
}
