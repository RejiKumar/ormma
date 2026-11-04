import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import { renderApp } from "../test-utils";
import type { FamilyParent } from "../family/useParents";
import { ContactsBlock } from "./ContactsBlock";
import { ProtocolCard } from "./ProtocolCard";

const T0 = Date.UTC(2026, 9, 19, 3, 0, 0); // 08:30 IST
const parent: FamilyParent = {
  id: "p1",
  name: "Amma",
  phone: "+919812345678",
  language: "ml-IN",
  timezone: "Asia/Kolkata",
  consent: { status: "granted", revokedAt: null, regrantedAt: null },
  emergencyContacts: [],
  city: "",
  prescriber: "",
  refillDue: null,
  callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60 },
  role: "viewer",
};

describe("ProtocolCard", () => {
  it("lists Call 1, two retries and the caregiver alert at the parent's policy times", async () => {
    await renderApp(<ProtocolCard parent={parent} firstAt={T0} dimmed />);
    expect(screen.getByText("8:30 AM")).toBeTruthy();
    expect(screen.getByText("8:40 AM")).toBeTruthy();
    expect(screen.getByText("8:50 AM")).toBeTruthy();
    expect(screen.getByText("9:30 AM")).toBeTruthy();
    expect(screen.getByText("Call 1")).toBeTruthy();
    expect(screen.getByText("Retry 2")).toBeTruthy();
    expect(screen.getByText("Caregiver alert")).toBeTruthy();
    expect(screen.getByText("Last attempt before the family is told.")).toBeTruthy();
  });

  it("follows a different call policy", async () => {
    await renderApp(
      <ProtocolCard
        parent={{ ...parent, callPolicy: { retryCount: 1, retryGapMinutes: 15, missedAfterMinutes: 45 } }}
        firstAt={T0}
        dimmed={false}
      />,
    );
    expect(screen.getByText("8:45 AM")).toBeTruthy();
    expect(screen.getByText("9:15 AM")).toBeTruthy();
    expect(screen.queryByText("Retry 2")).toBeNull();
  });

  it("hides the times when there is no dose to start from, and says nothing about why a dose is missed", async () => {
    await renderApp(<ProtocolCard parent={parent} firstAt={null} dimmed />);
    expect(screen.queryByText("8:30 AM")).toBeNull();
    expect(screen.queryByText(/because|reason|should/i)).toBeNull();
  });
});

describe("ContactsBlock", () => {
  const contacts = [
    { label: "Sreeja", kind: "neighbour" as const, phone: "+919876500001", note: "2 min walk from Amma" },
    { label: "Dr. Nair", kind: "clinic" as const, phone: "+919876500002" },
  ];

  it("shows an initial, the note (or the type) and a Call button that opens the dialer", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderApp(<ContactsBlock contacts={contacts} />);
    expect(screen.getByText("S")).toBeTruthy();
    expect(screen.getByText("2 min walk from Amma")).toBeTruthy();
    expect(screen.getByText("Clinic")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("escalation-contact-1"));
    expect(open).toHaveBeenCalledWith("tel:+919876500002");
    open.mockRestore();
  });

  it("disables the Call buttons while nothing is missed", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    await renderApp(<ContactsBlock contacts={contacts} disabled />);
    await fireEvent.press(screen.getByTestId("escalation-contact-0"));
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("renders nothing without contacts", async () => {
    await renderApp(<ContactsBlock contacts={[]} />);
    expect(screen.queryByTestId("contacts-block")).toBeNull();
  });
});
