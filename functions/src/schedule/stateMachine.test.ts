import { applyTransition, type DoseEventState } from "./stateMachine";

const base = (overrides: Partial<DoseEventState> = {}): DoseEventState => ({
  status: "pending",
  attempts: 0,
  scheduledFor: Date.UTC(2026, 9, 23, 3, 30),
  lastCallSid: null,
  missedAt: null,
  resolvedAt: null,
  resolvedBy: null,
  resolvedByUid: null,
  alertSent: false,
  groupConfirmed: false,
  lastCallAt: null,
  reminderAt: null,
  ...overrides,
});

describe("applyTransition", () => {
  it("moves pending -> calling on call_started and increments attempts/lastCallAt", () => {
    const at = Date.UTC(2026, 9, 23, 3, 31);
    const result = applyTransition(base(), { type: "call_started", at });
    expect(result?.state.status).toBe("calling");
    expect(result?.state.attempts).toBe(1);
    expect(result?.state.lastCallAt).toBe(at);
  });

  it("rejects call_started from non-pending states", () => {
    expect(applyTransition(base({ status: "calling" }), { type: "call_started", at: 1 })).toBeNull();
    expect(applyTransition(base({ status: "taken" }), { type: "call_started", at: 1 })).toBeNull();
  });

  it("resolves calling -> taken on answered_yes with via and grouping flag", () => {
    const at = Date.UTC(2026, 9, 23, 3, 32);
    const result = applyTransition(base({ status: "calling" }), {
      type: "answered_yes",
      at,
      via: "dtmf",
      grouped: true,
    });
    expect(result?.state.status).toBe("taken");
    expect(result?.state.resolvedAt).toBe(at);
    expect(result?.state.resolvedBy).toBe("dtmf");
    expect(result?.state.resolvedByUid).toBeNull();
    expect(result?.state.groupConfirmed).toBe(true);
  });

  it("answered_not_yet schedules at most one reminder", () => {
    const at = Date.UTC(2026, 9, 23, 3, 32);
    const first = applyTransition(base({ status: "calling", attempts: 1 }), {
      type: "answered_not_yet",
      at,
      grouped: false,
      retryGapMinutes: 10,
    });
    expect(first?.state.status).toBe("not_taken");
    expect(first?.state.reminderAt).toBe(at + 10 * 60_000);
    expect(first?.effect.reminderAt).toBe(at + 10 * 60_000);

    const retried = applyTransition(first!.state, {
      type: "reminder_due",
      at: at + 10 * 60_000,
      retryCount: 2,
    });
    const callingAgain = applyTransition(retried!.state, {
      type: "call_started",
      at: at + 11 * 60_000,
    });
    const second = applyTransition(callingAgain!.state, {
      type: "answered_not_yet",
      at: at + 12 * 60_000,
      grouped: false,
      retryGapMinutes: 10,
    });
    expect(second?.state.status).toBe("not_taken");
    expect(second?.state.reminderAt).toBe(first?.state.reminderAt);
    expect(second?.effect.reminderAt).toBeUndefined();
  });

  it("no_answer returns to pending until attempts exhausted, then misses", () => {
    const pending = applyTransition(
      base({ status: "calling", attempts: 2 }),
      { type: "no_answer", at: 100, retryCount: 2 },
    );
    expect(pending?.state.status).toBe("pending");

    const missed = applyTransition(
      base({ status: "calling", attempts: 1 + 2 }),
      { type: "no_answer", at: 300, retryCount: 2 },
    );
    expect(missed?.state.status).toBe("missed");
    expect(missed?.state.missedAt).toBe(300);
    expect(missed?.effect.alert).toBe("missed_dose");
    expect(missed?.effect.missed).toBe(true);
  });

  it("no_answer does not emit an alert when already sent", () => {
    const result = applyTransition(
      base({ status: "calling", attempts: 3, alertSent: true }),
      { type: "no_answer", at: 400, retryCount: 2 },
    );
    expect(result?.state.status).toBe("missed");
    expect(result?.effect.alert).toBeUndefined();
  });

  it("unclear schedules a reminder on first transition", () => {
    const at = 1000;
    const result = applyTransition(base({ status: "calling" }), { type: "unclear", at });
    expect(result?.state.status).toBe("unclear");
    expect(result?.state.reminderAt).toBe(at);
    expect(result?.effect.reminderAt).toBe(at);
  });

  it("reminder_due re-enqueues pending before exhaustion and misses after", () => {
    const reminderAt = 5000;
    const pending = applyTransition(
      base({ status: "not_taken", attempts: 1, reminderAt }),
      { type: "reminder_due", at: reminderAt, retryCount: 2 },
    );
    expect(pending?.state.status).toBe("pending");

    const missed = applyTransition(
      base({ status: "unclear", attempts: 3, reminderAt }),
      { type: "reminder_due", at: reminderAt, retryCount: 2 },
    );
    expect(missed?.state.status).toBe("missed");
    expect(missed?.state.missedAt).toBe(reminderAt);
  });

  it("missed_check marks missed at or after scheduledFor+missedAfterMinutes", () => {
    const scheduledFor = Date.UTC(2026, 9, 23, 3, 30);
    const early = applyTransition(
      base({ status: "pending", scheduledFor }),
      { type: "missed_check", at: scheduledFor + 59 * 60_000, missedAfterMinutes: 60 },
    );
    expect(early).toBeNull();

    const late = applyTransition(
      base({ status: "no_answer", scheduledFor }),
      { type: "missed_check", at: scheduledFor + 60 * 60_000, missedAfterMinutes: 60 },
    );
    expect(late?.state.status).toBe("missed");
    expect(late?.state.missedAt).toBe(scheduledFor + 60 * 60_000);
  });

  it("family_confirm resolves open events and clears group confirmation", () => {
    const at = 9000;
    const result = applyTransition(base({ status: "not_taken", attempts: 1 }), {
      type: "family_confirm",
      at,
      uid: "u1",
    });
    expect(result?.state.status).toBe("taken");
    expect(result?.state.resolvedBy).toBe("family");
    expect(result?.state.resolvedByUid).toBe("u1");
    expect(result?.state.resolvedAt).toBe(at);
    expect(result?.state.groupConfirmed).toBe(false);
  });

  it("family_override re-opens missed but keeps server fields", () => {
    const at = 10000;
    const result = applyTransition(
      base({
        status: "missed",
        missedAt: 5000,
        attempts: 3,
        alertSent: true,
        lastCallSid: "CA123",
        resolvedAt: null,
      }),
      { type: "family_override", at, uid: "u2" },
    );
    expect(result?.state.status).toBe("taken");
    expect(result?.state.resolvedBy).toBe("family");
    expect(result?.state.resolvedByUid).toBe("u2");
    expect(result?.state.missedAt).toBe(5000);
    expect(result?.state.attempts).toBe(3);
    expect(result?.state.alertSent).toBe(true);
    expect(result?.state.lastCallSid).toBe("CA123");
  });

  it("blocks transitions out of taken and out of missed without family_override", () => {
    expect(applyTransition(base({ status: "taken" }), { type: "no_answer", at: 1, retryCount: 2 })).toBeNull();
    expect(applyTransition(base({ status: "missed" }), { type: "family_confirm", at: 1, uid: "u" })).toBeNull();
  });
});
