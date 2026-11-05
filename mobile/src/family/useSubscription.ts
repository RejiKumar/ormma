// The signed-in account's entitlement, read from subscriptions/{uid} (written only by Cloud Functions).
import { doc, getFirestore, onSnapshot } from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { planOf, type Entitlement, type PlanName, type SubscriptionStatus } from "./plan";
import { timestampMs } from "./useParents";

export interface UseSubscriptionResult {
  plan: PlanName;
  entitlement: Entitlement | null;
  loading: boolean;
}

const STATUSES: SubscriptionStatus[] = ["active", "cancelled", "expired", "refunded"];

export function toEntitlement(data: Record<string, unknown> | undefined): Entitlement | null {
  if (!data) return null;
  const expiresAtMs = timestampMs(data.expiresAt);
  const status = data.status;
  if (expiresAtMs === null || !STATUSES.includes(status as SubscriptionStatus)) return null;
  return { status: status as SubscriptionStatus, productId: String(data.productId ?? ""), expiresAtMs };
}

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [loading, setLoading] = useState(uid !== null);

  useEffect(() => {
    if (!uid) {
      setEntitlement(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(
      doc(getFirestore(), "subscriptions", uid),
      (snapshot) => {
        setEntitlement(snapshot.exists() ? toEntitlement(snapshot.data() as Record<string, unknown>) : null);
        setLoading(false);
      },
      (error) => {
        // Ids and statuses only in logs (hard rule 6).
        console.warn(`subscription snapshot failed code=${(error as { code?: string } | null)?.code ?? "unknown"}`);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  return { plan: planOf(entitlement, Date.now()), entitlement, loading };
}
