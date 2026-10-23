// Recent alerts across the member's parents, newest first, consent-correct per parent.
// Alerts are a single list, so this hook takes every parent at once and merges N subscriptions
// (0-2 provable ranges each, from src/family/visibility.ts) into one createdAt-desc stream.
import { collection, getFirestore, limit, onSnapshot, orderBy, query, where } from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import type { AlertType } from "../../../shared/types";
import type { DatedParent } from "./useParents";
import { timestampMs } from "./useParents";
import { visibilityRanges } from "./visibility";

/** Newest alerts shown on the dashboard. */
export const ALERTS_LIMIT = 20;

export interface FamilyAlert {
  id: string;
  type: AlertType;
  /** Fixed template text from the catalogue of alert templates; never raw health values. */
  message: string;
  relatedEventId: string | null;
  /** Epoch ms of createdAt. */
  createdAt: number;
  readBy: string[];
}

export interface UseAlertsResult {
  alerts: FamilyAlert[];
  /** True until every issued query has delivered its first snapshot (or failed). */
  loading: boolean;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toAlert(id: string, data: Record<string, unknown> | undefined): FamilyAlert | null {
  const createdAt = timestampMs(data?.createdAt);
  if (createdAt === null) return null;
  return {
    id,
    type: typeof data?.type === "string" ? (data.type as AlertType) : "missed_dose",
    message: str(data?.message),
    relatedEventId: typeof data?.relatedEventId === "string" ? data.relatedEventId : null,
    createdAt,
    readBy: Array.isArray(data?.readBy) ? data.readBy.filter((u): u is string => typeof u === "string") : [],
  };
}

export function useAlerts(parents: DatedParent[], window: { start: number; end: number }): UseAlertsResult {
  const [alerts, setAlerts] = useState<FamilyAlert[]>([]);
  const [loading, setLoading] = useState(parents.length > 0);

  const parentsKey = parents
    .map((p) => `${p.id}:${p.role}:${p.consent?.revokedAt ?? ""}:${p.consent?.regrantedAt ?? ""}`)
    .join("|");
  const windowKey = `${window.start}:${window.end}`;

  useEffect(() => {
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    const docsByKey = new Map<string, Map<string, FamilyAlert>>();
    const pending = new Set<string>();

    const publish = () => {
      if (cancelled) return;
      const merged = new Map<string, FamilyAlert>();
      for (const docs of docsByKey.values()) for (const [id, alert] of docs) merged.set(id, alert);
      setAlerts([...merged.values()].sort((a, b) => b.createdAt - a.createdAt));
      if (pending.size === 0) setLoading(false);
    };

    let totalQueries = 0;
    for (const parent of parents) {
      const ranges = visibilityRanges(parent.role, parent.consent, window.start, window.end);
      ranges.forEach((range, index) => {
        const key = `${parent.id}#${index}`;
        totalQueries += 1;
        pending.add(key);
        docsByKey.set(key, new Map());
        const db = getFirestore();
        const alertsQuery = query(
          collection(db, "parents", parent.id, "alerts"),
          where("createdAt", ">=", range.gte),
          where("createdAt", "<", range.lt),
          orderBy("createdAt", "desc"),
          limit(ALERTS_LIMIT),
        );
        const unsubscribe = onSnapshot(
          alertsQuery,
          (snapshot) => {
            if (cancelled) return;
            const docs = new Map<string, FamilyAlert>();
            for (const d of snapshot.docs) {
              const alert = toAlert(d.id, d.data());
              if (alert) docs.set(alert.id, alert);
            }
            docsByKey.set(key, docs);
            pending.delete(key);
            publish();
          },
          (error) => {
            // Ids and statuses only in logs (hard rule 6).
            const code = (error as { code?: string } | null)?.code ?? "unknown";
            console.warn(`alerts snapshot failed code=${code}`);
            pending.delete(key);
            publish();
          },
        );
        unsubscribers.push(unsubscribe);
      });
    }

    if (totalQueries === 0) {
      setAlerts([]);
      setLoading(false);
    } else if (pending.size > 0) {
      setLoading(true);
    }

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
    // parentsKey/windowKey capture the content of the args (stable references re-subscribe
    // only when role, consent or the window actually change).
  }, [parentsKey, windowKey]);

  return { alerts, loading };
}
