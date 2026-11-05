import { useCallback, useEffect, useState } from "react";
import { getCallHistory, type CallHistoryEntry } from "./callables";
import { useReportLoading } from "../navigation/TabLoading";

/** The last calls for one parent (Ormma and family), newest first. Read-only; reload after logging a call. */
export function useCallHistory(parentId: string | null): {
  entries: CallHistoryEntry[];
  loading: boolean;
  reload: () => void;
} {
  const [entries, setEntries] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(parentId !== null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!parentId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCallHistory({ parentId })
      .then((result) => {
        if (!cancelled) setEntries(result.entries ?? []);
      })
      .catch((error) => {
        // Ids and statuses only in logs (hard rule 6).
        console.warn(`callHistory failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useReportLoading(loading);
  return { entries, loading, reload };
}
