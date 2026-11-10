// Maps the data of a push message to the tab it should open. Pure, so it is easy to test.
// The server sets `type` (see createAlert.ts and eveningDigest.ts); anything unknown opens Today.

export type PushTab = "Today" | "Alerts";

const ALERT_TYPES = new Set([
  "missed_dose",
  "unclear_reply",
  "no_answer",
  "trend_flag",
  "weekly_summary",
  "urgent",
]);

export function pushTargetTab(data: Record<string, unknown> | undefined): PushTab {
  const type = typeof data?.type === "string" ? data.type : "";
  return ALERT_TYPES.has(type) ? "Alerts" : "Today";
}

export interface PushBannerContent {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/** Text and data of a message that arrived while the app was open; null when there is nothing to show. */
export function bannerFromMessage(message: {
  notification?: { title?: string; body?: string } | null;
  data?: Record<string, unknown>;
}): PushBannerContent | null {
  const title = message.notification?.title?.trim() ?? "";
  const body = message.notification?.body?.trim() ?? "";
  if (title.length === 0 && body.length === 0) return null;
  return { title, body, data: message.data ?? {} };
}
