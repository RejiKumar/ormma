import { Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import type { AlertDoc, AlertType } from "../../../shared/types";
import { deliverAlertPush, type PushSender } from "./fcm";
import type { MemberLanguage } from "./language";
import { alertTitle, buildUrgentMessage } from "./templates";

// Alert writes and delivery. The caller decides whether the write belongs to a transaction (missed
// doses) or is a standalone immediate alert (urgent).

export interface NewAlert {
  type: AlertType;
  message: string;
  relatedEventId: string | null;
  createdAt: Timestamp;
}

export function buildAlert(input: NewAlert): AlertDoc {
  return {
    type: input.type,
    message: input.message,
    relatedEventId: input.relatedEventId,
    createdAt: input.createdAt,
    readBy: [],
  };
}

export function writeAlert(
  tx: Transaction,
  db: Firestore,
  parentId: string,
  alert: NewAlert,
): { alertId: string; doc: AlertDoc } {
  const ref = db.collection(`parents/${parentId}/alerts`).doc();
  const doc = buildAlert(alert);
  tx.set(ref, doc);
  return { alertId: ref.id, doc };
}

export async function notifyAlert(
  db: Firestore,
  parentId: string,
  alertId: string,
  alert: AlertDoc,
  sender: PushSender,
  /** Writes the body in a recipient's language; without it everyone gets the stored (English) message. */
  bodyFor?: (language: MemberLanguage) => string,
): Promise<void> {
  const data = {
    type: alert.type,
    parentId,
    alertId,
    ...(alert.relatedEventId ? { relatedEventId: alert.relatedEventId } : {}),
  };
  await deliverAlertPush(
    db,
    parentId,
    (language) => ({
      title: alertTitle(alert.type, language),
      body: bodyFor ? bodyFor(language) : alert.message,
      data,
    }),
    sender,
    { alertType: alert.type },
  );
}

/** Writes and delivers an immediate urgent alert. */
export async function createUrgentAlert(
  db: Firestore,
  parentId: string,
  parentName: string,
  relatedEventId: string | null,
  sender: PushSender,
  nowMs = Date.now(),
): Promise<string> {
  const alert: NewAlert = {
    type: "urgent",
    message: buildUrgentMessage(parentName),
    relatedEventId,
    createdAt: Timestamp.fromMillis(nowMs),
  };
  const ref = db.collection(`parents/${parentId}/alerts`).doc();
  await ref.set(buildAlert(alert));
  await notifyAlert(db, parentId, ref.id, buildAlert(alert), sender, (language) =>
    buildUrgentMessage(parentName, language),
  );
  return ref.id;
}
