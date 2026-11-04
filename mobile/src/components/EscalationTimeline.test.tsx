import { screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { renderApp } from "../test-utils";
import type { FamilyParent } from "../family/useParents";
import { EscalationTimeline } from "./EscalationTimeline";

type FunctionsMock = { httpsCallable: jest.Mock; __callables: Record<string, jest.Mock> };
const fnsMock = jest.requireMock("@react-native-firebase/functions") as FunctionsMock;
const callable = (name: string): jest.Mock => {
  fnsMock.httpsCallable(undefined as never, name);
  return fnsMock.__callables[name];
};

const T0 = Date.UTC(2026, 10, 3, 3, 0, 0); // 08:30 IST
const parent: FamilyParent = {
  id: "p1",
  name: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [
    { label: "Sreeja", kind: "neighbour", phone: "+919876500001" },
    { label: "Dr. Nair", kind: "clinic", phone: "+919876500002" },
  ],
  role: "viewer",
};

describe("EscalationTimeline", () => {
  it("lists call 1, retries and the alert time in the parent's timezone, then the contacts", async () => {
    callable("getDoseEscalation").mockResolvedValue({
      data: {
        status: "missed",
        unplaced: 0,
        alertAtMs: T0 + 60 * 60_000,
        attempts: [
          { ordinal: 1, startedAtMs: T0, outcome: "no_answer" },
          { ordinal: 2, startedAtMs: T0 + 10 * 60_000, outcome: "no_answer" },
          { ordinal: 3, startedAtMs: T0 + 20 * 60_000, outcome: "failed" },
        ],
      },
    });
    await renderApp(<EscalationTimeline parent={parent} doseEventId="e1" />);

    expect(await screen.findByText("Call 1")).toBeTruthy();
    expect(screen.getByText("08:30 · No answer")).toBeTruthy();
    expect(screen.getByText("Retry 1")).toBeTruthy();
    expect(screen.getByText("08:40 · No answer")).toBeTruthy();
    expect(screen.getByText("Retry 2")).toBeTruthy();
    expect(screen.getByText("08:50 · Call failed")).toBeTruthy();
    expect(screen.getByText("Family alerted")).toBeTruthy();
    expect(screen.getByText("09:30")).toBeTruthy();
    expect(screen.getByText("Sreeja")).toBeTruthy();
    expect(screen.getByText("Dr. Nair")).toBeTruthy();
    expect(callable("getDoseEscalation")).toHaveBeenCalledWith({ parentId: "p1", doseEventId: "e1" });
  });

  it("opens the phone dialer for a contact and places no call itself", async () => {
    callable("getDoseEscalation").mockResolvedValue({
      data: { status: "missed", unplaced: 0, alertAtMs: null, attempts: [] },
    });
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderApp(<EscalationTimeline parent={parent} doseEventId="e1" />);
    await fireEvent.press(await screen.findByTestId("escalation-contact-1"));
    expect(open).toHaveBeenCalledWith("tel:+919876500002");
    open.mockRestore();
  });

  it("says no calls were made when there are no attempts, and counts unplaced attempts", async () => {
    callable("getDoseEscalation").mockResolvedValue({
      data: { status: "missed", unplaced: 2, alertAtMs: null, attempts: [] },
    });
    await renderApp(<EscalationTimeline parent={{ ...parent, emergencyContacts: [] }} doseEventId="e2" />);
    expect(await screen.findByText("No calls have been made yet.")).toBeTruthy();
    expect(screen.getByText("2 attempts were not placed")).toBeTruthy();
    expect(screen.queryByText("People who can check in")).toBeNull();
  });

  it("shows a short message when the callable fails", async () => {
    callable("getDoseEscalation").mockRejectedValue({ code: "permission-denied" });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    await renderApp(<EscalationTimeline parent={parent} doseEventId="e3" />);
    await waitFor(() => expect(screen.getByText("Could not load the call attempts.")).toBeTruthy());
    expect(warn).toHaveBeenCalledWith("escalation failed code=permission-denied");
    warn.mockRestore();
  });
});
