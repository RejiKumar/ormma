import { fireEvent, screen } from "@testing-library/react-native";
import { Linking } from "react-native";
import type { EmergencyContact } from "../../../shared/types";
import { renderApp } from "../test-utils";
import { ContactsBlock } from "./ContactsBlock";

const contacts: EmergencyContact[] = [
  { label: "Sreeja", kind: "neighbour", phone: "+919876500011", note: "2 min walk from home" },
  { label: "Dr. Nair", kind: "clinic", phone: "+919876500022" },
];

describe("ContactsBlock", () => {
  it("lists the parent's direct line first, then the contacts", async () => {
    await renderApp(<ContactsBlock contacts={contacts} parent={{ name: "Amma", phone: "+919812345678" }} />);
    expect(screen.getByTestId("escalation-contact-0")).toHaveProp("accessibilityLabel", "Call Amma");
    expect(screen.getByTestId("escalation-contact-1")).toHaveProp("accessibilityLabel", "Call Sreeja");
    expect(screen.getByTestId("escalation-contact-2")).toHaveProp("accessibilityLabel", "Call Dr. Nair");
    expect(screen.getByText("Parent")).toBeTruthy();
    expect(screen.getByText("2 min walk from home")).toBeTruthy();
  });

  it("opens the dialer with the parent's number", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    await renderApp(<ContactsBlock contacts={contacts} parent={{ name: "Amma", phone: "+919812345678" }} />);
    await fireEvent.press(screen.getByTestId("escalation-contact-0"));
    expect(open).toHaveBeenCalledWith("tel:+919812345678");
    open.mockRestore();
  });

  it("disables every Call button, the parent's included, in the calm state", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    await renderApp(<ContactsBlock contacts={contacts} parent={{ name: "Amma", phone: "+919812345678" }} disabled />);
    await fireEvent.press(screen.getByTestId("escalation-contact-0"));
    await fireEvent.press(screen.getByTestId("escalation-contact-1"));
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it("hides the parent row when there is no phone number", async () => {
    await renderApp(<ContactsBlock contacts={contacts} parent={{ name: "Amma", phone: "" }} />);
    expect(screen.queryByText("Parent")).toBeNull();
    expect(screen.getByTestId("escalation-contact-0")).toHaveProp("accessibilityLabel", "Call Sreeja");
  });

  it("shows only the parent when there are no emergency contacts", async () => {
    await renderApp(<ContactsBlock contacts={[]} parent={{ name: "Amma", phone: "+919812345678" }} />);
    expect(screen.getByTestId("escalation-contact-0")).toBeTruthy();
    expect(screen.queryByTestId("escalation-contact-1")).toBeNull();
  });
});
