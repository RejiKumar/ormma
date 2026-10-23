import type { Language } from "../../shared/types";

// Telephony boundary. Stage 4 ships only a log-only implementation: no real calls are placed
// until the Exotel provider arrives in Stage 5. Payloads carry ids and statuses only in logs.

export interface CallRequest {
  parentId: string;
  /** Used by the greeting in Stage 5; never logged. */
  parentName: string;
  /** E.164; never logged. */
  phone: string;
  language: Language;
  timezone: string;
  scheduledFor: number;
  doseEventIds: string[];
}

export interface CallHandle {
  callSid: string;
}

export interface CallProvider {
  readonly name: string;
  startCall(request: CallRequest): Promise<CallHandle>;
}

/** Default provider for this stage: records the request and returns a fake sid. */
export class LoggingCallProvider implements CallProvider {
  readonly name = "logging";
  private seq = 0;

  async startCall(request: CallRequest): Promise<CallHandle> {
    this.seq += 1;
    const callSid = `fake_${Date.now().toString(36)}_${this.seq}`;
    console.info("callProvider: fake call requested", {
      parentId: request.parentId,
      doseEventIds: request.doseEventIds,
      scheduledFor: request.scheduledFor,
      groupSize: request.doseEventIds.length,
      callSid,
    });
    return { callSid };
  }
}
