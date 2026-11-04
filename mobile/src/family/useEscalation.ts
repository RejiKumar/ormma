import { useEffect, useState } from "react";
import { getDoseEscalation, type DoseEscalation } from "./callables";

export interface UseEscalationResult {
  data: DoseEscalation | null;
  loading: boolean;
  failed: boolean;
}

/** Loads the call attempts for one dose event when `enabled` becomes true. Read-only. */
export function useEscalation(parentId: string, doseEventId: string, enabled: boolean): UseEscalationResult {
  const [data, setData] = useState<DoseEscalation | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getDoseEscalation({ parentId, doseEventId })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((error) => {
        // Ids and statuses only in logs (hard rule 6).
        console.warn(`escalation failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, doseEventId, enabled]);

  return { data, loading, failed };
}
