// Realtime medicines list for one parent. Medicines are undated reads (rules: isMember only),
// so no consent range is needed; the list is ordered by name for stable display.
import { collection, getFirestore, onSnapshot, orderBy, query } from "@react-native-firebase/firestore";
import { useEffect, useState } from "react";
import type { MedicineSource } from "../../../shared/types";

export interface Medicine {
  id: string;
  name: string;
  doseText: string;
  times: string[];
  startDate: string;
  endDate: string | null;
  active: boolean;
  source: MedicineSource;
  confirmedByHuman: boolean;
  prescriptionId: string | null;
  createdBy: string;
}

export interface UseMedicinesResult {
  medicines: Medicine[];
  /** True until the first snapshot (or error) for the current parent. */
  loading: boolean;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function strOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toMedicine(id: string, data: Record<string, unknown> | undefined): Medicine {
  const times = Array.isArray(data?.times) ? data.times.filter((t): t is string => typeof t === "string") : [];
  const source = typeof data?.source === "string" ? (data.source as MedicineSource) : "manual";
  return {
    id,
    name: str(data?.name),
    doseText: str(data?.doseText),
    times,
    startDate: str(data?.startDate, "1970-01-01"),
    endDate: strOrNull(data?.endDate),
    active: typeof data?.active === "boolean" ? data.active : true,
    source,
    confirmedByHuman: data?.confirmedByHuman === true,
    prescriptionId: strOrNull(data?.prescriptionId),
    createdBy: str(data?.createdBy),
  };
}

export function useMedicines(parentId: string | null): UseMedicinesResult {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(parentId !== null);

  useEffect(() => {
    if (!parentId) {
      setMedicines([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const db = getFirestore();
    const medicinesQuery = query(collection(db, "parents", parentId, "medicines"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(
      medicinesQuery,
      (snapshot) => {
        if (cancelled) return;
        setMedicines(snapshot.docs.map((d) => toMedicine(d.id, d.data())));
        setLoading(false);
      },
      (error) => {
        // Ids and statuses only in logs (hard rule 6).
        const code = (error as { code?: string } | null)?.code ?? "unknown";
        console.warn(`medicines snapshot failed code=${code}`);
        if (!cancelled) setLoading(false);
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [parentId]);

  return { medicines, loading };
}
