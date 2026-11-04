import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useAlerts } from "./useAlerts";
import { useParents } from "./useParents";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Number of unread missed-dose and urgent alerts for the signed-in member in the visible window.
 * The Alerts tab shows a dot while it is above zero.
 */
export function useUnreadUrgentAlertCount(): number {
  const { user } = useAuth();
  const { parents } = useParents();
  // One clock reading per mount: a fresh Date.now() each render would re-key the query window.
  const [now] = useState(() => Date.now());
  const { alerts } = useAlerts(parents, { start: now - WINDOW_MS, end: now + WINDOW_MS });
  const uid = user?.uid;
  if (!uid) return 0;
  return alerts.filter(
    (alert) => (alert.type === "missed_dose" || alert.type === "urgent") && !alert.readBy.includes(uid),
  ).length;
}
