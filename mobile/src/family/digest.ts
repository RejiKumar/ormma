import type { TFunction } from "i18next";
import { clock12, periodKey, shortDay, wallClock, type DoseCard } from "./cards";

/**
 * The plain-text family update for one parent: the fixed template of the evening-digest spec, built on
 * the device from today's cards. It names doses, times and the next medicine; it never includes
 * confirmation notes, readings, free text or advice, and nothing is generated. Null with no doses.
 */
export function buildDigest(
  t: TFunction,
  parent: { name: string; timezone: string },
  cards: DoseCard[],
  now: number,
): string | null {
  if (cards.length === 0) return null;
  const tz = parent.timezone;
  const taken = cards.filter((c) => c.kind === "taken" || c.kind === "taken_on_time");
  const notConfirmed = cards.filter((c) => c.kind === "not_confirmed");

  const lines = [t("digest.header", { date: shortDay(tz, now) })];
  if (notConfirmed.length === 0) {
    lines.push(t("digest.onTrack", { name: parent.name, taken: taken.length, total: cards.length }));
  } else {
    lines.push(
      t("digest.notConfirmed", {
        name: parent.name,
        count: notConfirmed.length,
        times: notConfirmed.map((c) => clock12(tz, c.scheduledFor)).join(", "),
      }),
    );
  }
  const first = taken.find((c) => c.takenAt !== null);
  if (first && first.takenAt !== null) {
    lines.push(
      t("digest.takenAt", {
        period: t(`period.${periodKey(wallClock(tz, first.scheduledFor).hour)}`),
        time: clock12(tz, first.takenAt),
      }),
    );
  }
  const next = cards.find((c) => c.pending && c.scheduledFor >= now);
  if (next) {
    const time = clock12(tz, next.scheduledFor);
    lines.push(
      next.medicines.length > 0
        ? t("digest.next", { medicines: next.medicines, time })
        : t("digest.nextNoMedicine", { time }),
    );
  }
  return lines.join("\n");
}
