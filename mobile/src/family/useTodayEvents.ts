// Today's dose events per parent, consent-correct (access-control "Visibility check mechanics").
// One hook subscribes to every parent's doseEvents inside that parent's local today window
// (parents may sit in different timezones); the visibility helper decides 0-2 provable ranges
// per parent, and results merge into one map.
import { collection, getFirestore, onSnapshot, orderBy, query, where } from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import type { DoseStatus } from "../../../shared/types";
import type { DatedParent } from "./useParents";
import { timestampMs } from "./useParents";
import { localDayWindow, visibilityRanges } from "./visibility";

export interface TodayDoseEvent {
  id: string;
  medicineId: string;
  /** Epoch ms of scheduledFor. */
  scheduledFor: number;
  status: DoseStatus;
}

export interface UseTodayEventsResult {
  /** Today's events per parent id, sorted by scheduledFor ascending. */
  byParent: Record<string, TodayDoseEvent[]>;
  /** True until every issued query has delivered its first snapshot (or failed). */
  loading: boolean;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toEvent(id: string, data: Record<string, unknown> | undefined): TodayDoseEvent | null {
  const scheduledFor = timestampMs(data?.scheduledFor);
  if (scheduledFor === null) return null;
  return {
    id,
    medicineId: str(data?.medicineId),
    scheduledFor,
    status: typeof data?.status === "string" ? (data.status as DoseStatus) : "pending",
  };
}

export function useTodayEvents(parents: DatedParent[], now: number): UseTodayEventsResult {
  const [byParent, setByParent] = useState<Record<string, TodayDoseEvent[]>>({});
  const [loading, setLoading] = useState(parents.length > 0);

  const parentsKey = parents
    .map(
      (p) =>
        `${p.id}:${p.timezone}:${p.role}:${p.consent?.status ?? ""}:${p.consent?.revokedAt ?? ""}:${p.consent?.regrantedAt ?? ""}`,
    )
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const unsubscribers: Array<() => void> = [];
    const docsByKey = new Map<string, Map<string, TodayDoseEvent>>();
    const pending = new Set<string>();

    const publish = () => {
      if (cancelled) return;
      const merged: Record<string, TodayDoseEvent[]> = {};
      for (const parent of parents) {
        const events = new Map<string, TodayDoseEvent>();
        for (const [key, docs] of docsByKey) {
          if (key.startsWith(`${parent.id}#`)) for (const [id, event] of docs) events.set(id, event);
        }
        merged[parent.id] = [...events.values()].sort((a, b) => a.scheduledFor - b.scheduledFor);
      }
      setByParent(merged);
      if (pending.size === 0) setLoading(false);
    };

    let totalQueries = 0;
    for (const parent of parents) {
      const day = localDayWindow(parent.timezone, now);
      const ranges = visibilityRanges(parent.role, parent.consent, day.start, day.end);
      ranges.forEach((range, index) => {
        const key = `${parent.id}#${index}`;
        totalQueries += 1;
        pending.add(key);
        docsByKey.set(key, new Map());
        const db = getFirestore();
        const eventsQuery = query(
          collection(db, "parents", parent.id, "doseEvents"),
          where("scheduledFor", ">=", range.gte),
          where("scheduledFor", "<", range.lt),
          orderBy("scheduledFor", "asc"),
        );
        const unsubscribe = onSnapshot(
          eventsQuery,
          (snapshot) => {
            if (cancelled) return;
            const docs = new Map<string, TodayDoseEvent>();
            for (const d of snapshot.docs) {
              const event = toEvent(d.id, d.data());
              if (event) docs.set(event.id, event);
            }
            docsByKey.set(key, docs);
            pending.delete(key);
            publish();
          },
          (error) => {
            // Ids and statuses only in logs (hard rule 6).
            const code = (error as { code?: string } | null)?.code ?? "unknown";
            console.warn(`todayEvents snapshot failed code=${code}`);
            pending.delete(key);
            publish();
          },
        );
        unsubscribers.push(unsubscribe);
      });
    }

    if (totalQueries === 0) {
      const empty: Record<string, TodayDoseEvent[]> = {};
      for (const parent of parents) empty[parent.id] = [];
      setByParent(empty);
      setLoading(false);
    } else if (pending.size > 0) {
      setLoading(true);
    }

    return () => {
      cancelled = true;
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
    // parentsKey/now capture the content of the args so a stable array reference
    // still re-subscribes when role, consent or the clock changes.
  }, [parentsKey, now]);

  return { byParent, loading };
}
