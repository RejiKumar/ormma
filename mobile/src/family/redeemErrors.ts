// Maps a redeemInvite rejection to a catalogue key, so each rejection reason gets its own message.
// The failed-precondition trio is distinguished by the function's message text; the messages are
// fixed strings owned by functions/src/invites.ts (decision #58).

export type RedeemErrorKey =
  | "invalidFormat"
  | "unknown"
  | "expired"
  | "used"
  | "alreadyMember"
  | "failed";

export function redeemErrorKey(error: unknown): RedeemErrorKey {
  const err = error as { code?: string; message?: string } | null;
  const code = (err?.code ?? "").replace(/^functions\//, "");
  const message = err?.message ?? "";
  if (code === "invalid-argument") return "invalidFormat";
  if (code === "not-found") return "unknown";
  if (code === "failed-precondition") {
    if (message.includes("already used")) return "used";
    if (message.includes("expired")) return "expired";
    if (message.includes("already a member")) return "alreadyMember";
  }
  return "failed";
}
