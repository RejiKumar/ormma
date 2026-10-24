import { Timestamp } from "firebase-admin/firestore";

export interface TrendThresholds {
  bpIncreasePercent: number;
  sugarIncreasePercent: number;
}

export const DEFAULT_TRENDS: TrendThresholds = { bpIncreasePercent: 10, sugarIncreasePercent: 10 };

export interface Reading {
  type: "bp" | "sugar" | string;
  values: Record<string, unknown>;
  createdAt: Timestamp | Date | number;
}

const ms = (v: Reading["createdAt"]): number => {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof (v as Timestamp).toMillis === "function") return (v as Timestamp).toMillis();
  return 0;
};

const avgBp = (readings: Reading[]): number | null => {
  const bps = readings
    .filter((r) => r.type === "bp")
    .map((r) => {
      const s = Number((r.values as { systolic?: unknown }).systolic);
      const d = Number((r.values as { diastolic?: unknown }).diastolic);
      if (!Number.isFinite(s) || !Number.isFinite(d)) return null;
      return (s + d) / 2;
    })
    .filter((v): v is number => v !== null);
  if (bps.length === 0) return null;
  return bps.reduce((a, b) => a + b, 0) / bps.length;
};

const avgSugar = (readings: Reading[]): number | null => {
  const vals = readings
    .filter((r) => r.type === "sugar")
    .map((r) => {
      const v = Number((r.values as { value?: unknown; reading?: unknown }).value ?? (r.values as { value?: unknown }).value ?? (r.values as any).mgdl ?? (r.values as any).reading);
      if (!Number.isFinite(v)) return null;
      return v;
    })
    .filter((v): v is number => v !== null);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
};

export interface TrendFlag {
  type: "bp" | "sugar";
  flagged: boolean;
  currentAvg: number | null;
  previousAvg: number | null;
  increasePercent: number | null;
}

export function computeTrends(
  readings: Reading[],
  nowMs: number,
  thresholds: TrendThresholds = DEFAULT_TRENDS,
): TrendFlag[] {
  const day = 24 * 60 * 60 * 1000;
  const currentStart = nowMs - 7 * day;
  const prevStart = nowMs - 14 * day;

  const inCurrent = readings.filter((r) => {
    const t = ms(r.createdAt);
    return t >= currentStart && t < nowMs;
  });
  const inPrev = readings.filter((r) => {
    const t = ms(r.createdAt);
    return t >= prevStart && t < currentStart;
  });

  const ca = avgBp(inCurrent);
  const pa = avgBp(inPrev);
  const bp: TrendFlag = {
    type: "bp",
    flagged: false,
    currentAvg: ca,
    previousAvg: pa,
    increasePercent: pa && pa > 0 && ca ? ((ca - pa) / pa) * 100 : null,
  };
  if (bp.increasePercent !== null && bp.increasePercent > thresholds.bpIncreasePercent) bp.flagged = true;

  const cs = avgSugar(inCurrent);
  const ps = avgSugar(inPrev);
  const sugar: TrendFlag = {
    type: "sugar",
    flagged: false,
    currentAvg: cs,
    previousAvg: ps,
    increasePercent: ps && ps > 0 && cs ? ((cs - ps) / ps) * 100 : null,
  };
  if (sugar.increasePercent !== null && sugar.increasePercent > thresholds.sugarIncreasePercent) sugar.flagged = true;

  return [bp, sugar];
}
