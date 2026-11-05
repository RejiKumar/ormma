// Recognises the plan-limit errors the server sends (code resource-exhausted, details.reason).
export type PlanLimitReason = "plan_parent_limit" | "plan_member_limit";

export function planLimitReason(error: unknown): PlanLimitReason | null {
  const err = error as { code?: string; details?: { reason?: string } } | null;
  const code = (err?.code ?? "").replace(/^functions\//, "");
  if (code !== "resource-exhausted") return null;
  const reason = err?.details?.reason;
  return reason === "plan_parent_limit" || reason === "plan_member_limit" ? reason : null;
}
