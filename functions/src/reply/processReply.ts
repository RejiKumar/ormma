import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type { CallPolicy, Language, ParentDoc } from "../../../shared/types";
import { createUrgentAlert } from "../alerts/createAlert";
import type { PushSender } from "../alerts/fcm";
import { DEFAULT_CALL_POLICY, toDoseEventState } from "../schedule/dispatch";
import { applyTransition } from "../schedule/stateMachine";
import type { ReplyModelClient } from "./anthropicClient";
import type { ReplyQuestion } from "../prompts/replyStructuring.v1";
import { structureReply, type StructuredReplyResult } from "./replyStructuring";

// Orchestration for a transcribed voice reply: urgent keyword first, then the model, then (only for
// a schema-valid, high-confidence result) the dose transition. Nothing here logs the transcript.

export interface ProcessReplyInput {
  db: Firestore;
  parentId: string;
  parentName: string;
  language: Language;
  question: ReplyQuestion;
  eventIds: string[];
  transcript: string;
  sender: PushSender;
  client: ReplyModelClient;
  nowMs?: number;
}

export interface ProcessReplyResult {
  structured: StructuredReplyResult;
  urgentAlertId: string | null;
  doseChanged: boolean;
}

const policyOf = (parent: ParentDoc | undefined): CallPolicy => ({
  retryCount:
    typeof parent?.callPolicy?.retryCount === "number"
      ? parent.callPolicy.retryCount
      : DEFAULT_CALL_POLICY.retryCount,
  retryGapMinutes:
    typeof parent?.callPolicy?.retryGapMinutes === "number"
      ? parent.callPolicy.retryGapMinutes
      : DEFAULT_CALL_POLICY.retryGapMinutes,
  missedAfterMinutes:
    typeof parent?.callPolicy?.missedAfterMinutes === "number"
      ? parent.callPolicy.missedAfterMinutes
      : DEFAULT_CALL_POLICY.missedAfterMinutes,
  quietHours: parent?.callPolicy?.quietHours ?? DEFAULT_CALL_POLICY.quietHours,
});

export async function processReply(input: ProcessReplyInput): Promise<ProcessReplyResult> {
  const nowMs = input.nowMs ?? Date.now();
  let urgentAlertId: string | null = null;

  const structured = await structureReply(
    {
      transcript: input.transcript,
      language: input.language,
      question: input.question,
    },
    {
      client: input.client,
      onUrgentKeyword: async () => {
        urgentAlertId = await createUrgentAlert(
          input.db,
          input.parentId,
          input.parentName,
          input.eventIds[0] ?? null,
          input.sender,
          nowMs,
        );
      },
    },
  );

  if (structured.urgent && structured.urgentSource === "model" && urgentAlertId === null) {
    urgentAlertId = await createUrgentAlert(
      input.db,
      input.parentId,
      input.parentName,
      input.eventIds[0] ?? null,
      input.sender,
      nowMs,
    );
  }

  if (structured.tookMedicine === null || input.eventIds.length === 0) {
    return { structured, urgentAlertId, doseChanged: false };
  }

  const parentSnap = await input.db.doc(`parents/${input.parentId}`).get();
  const policy = policyOf(parentSnap.data() as ParentDoc | undefined);
  const grouped = input.eventIds.length > 1;

  const doseChanged = await input.db.runTransaction(async (tx) => {
    const refs = input.eventIds.map((id) =>
      input.db.doc(`parents/${input.parentId}/doseEvents/${id}`),
    );
    const docs = await tx.getAll(...refs);
    let changed = false;

    for (const doc of docs) {
      if (!doc.exists) continue;
      const state = toDoseEventState(doc.data() as Record<string, unknown>);
      const patch: Record<string, unknown> = {};
      if (structured.confirmationNote !== null) patch.confirmationNote = structured.confirmationNote;

      if (structured.canApplyDoseStatus && state.status === "calling") {
        const result = applyTransition(
          state,
          structured.tookMedicine
            ? { type: "answered_yes", at: nowMs, via: "voice", grouped }
            : {
                type: "answered_not_yet",
                at: nowMs,
                grouped,
                retryGapMinutes: policy.retryGapMinutes,
              },
        );
        if (result) {
          patch.status = result.state.status;
          patch.resolvedAt =
            result.state.resolvedAt === null ? null : Timestamp.fromMillis(result.state.resolvedAt);
          patch.resolvedBy = result.state.resolvedBy;
          patch.resolvedByUid = result.state.resolvedByUid;
          patch.groupConfirmed = result.state.groupConfirmed;
          patch.reminderAt =
            result.state.reminderAt === null ? null : Timestamp.fromMillis(result.state.reminderAt);
          patch.lastCallAt =
            result.state.lastCallAt === null ? null : Timestamp.fromMillis(result.state.lastCallAt);
          changed = true;
        }
      }

      if (Object.keys(patch).length > 0) tx.set(doc.ref, patch, { merge: true });
    }
    return changed;
  });

  return { structured, urgentAlertId, doseChanged };
}
