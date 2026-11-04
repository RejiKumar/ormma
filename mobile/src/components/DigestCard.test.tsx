import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import { Linking, Share } from "react-native";
import { renderApp } from "../test-utils";
import { DigestCard } from "./DigestCard";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
const setString = Clipboard.setStringAsync as jest.Mock;

const TEXT = "Ormma update, Mon 19 Oct\nAmma is on track: 2 of 3 doses confirmed.";

describe("DigestCard", () => {
  beforeEach(() => setString.mockReset());

  it("shows the prototype heading and the preview text", async () => {
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    expect(screen.getByText("WhatsApp digest")).toBeTruthy();
    expect(screen.getByText("Share with the family")).toBeTruthy();
    expect(screen.getByTestId("digest-text-p1")).toHaveTextContent(/Amma is on track: 2 of 3 doses confirmed./);
  });

  it("copies the exact text to the clipboard and confirms it", async () => {
    setString.mockResolvedValue(true);
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    await fireEvent.press(screen.getByTestId("digest-copy-p1"));
    await waitFor(() => expect(screen.getByTestId("digest-message-p1")).toHaveTextContent("Copied. Paste it in WhatsApp."));
    expect(setString).toHaveBeenCalledWith(TEXT);
  });

  it("says copying failed and points to Share when the clipboard is unavailable", async () => {
    setString.mockRejectedValue(new Error("no clipboard"));
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    await fireEvent.press(screen.getByTestId("digest-copy-p1"));
    await waitFor(() => expect(screen.getByTestId("digest-message-p1")).toHaveTextContent(/Use Share instead/));
  });

  it("hands the text to the share sheet", async () => {
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    await fireEvent.press(screen.getByTestId("digest-share-p1"));
    expect(share).toHaveBeenCalledWith({ message: TEXT });
    share.mockRestore();
  });

  it("opens WhatsApp with the encoded update and does not touch the share sheet", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    await fireEvent.press(screen.getByTestId("digest-whatsapp-p1"));
    expect(open).toHaveBeenCalledWith(`https://wa.me/?text=${encodeURIComponent(TEXT)}`);
    expect(share).not.toHaveBeenCalled();
    open.mockRestore();
    share.mockRestore();
  });

  it("falls back to the share sheet when WhatsApp cannot be opened", async () => {
    const open = jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    await renderApp(<DigestCard parentId="p1" text={TEXT} />);
    await fireEvent.press(screen.getByTestId("digest-whatsapp-p1"));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ message: TEXT }));
    open.mockRestore();
    share.mockRestore();
  });

  it("goes straight to the share sheet when the update is too long for a link", async () => {
    const open = jest.spyOn(Linking, "openURL").mockResolvedValue();
    const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction", activityType: undefined });
    const long = "x".repeat(2500);
    await renderApp(<DigestCard parentId="p1" text={long} />);
    await fireEvent.press(screen.getByTestId("digest-whatsapp-p1"));
    expect(open).not.toHaveBeenCalled();
    expect(share).toHaveBeenCalledWith({ message: long });
    open.mockRestore();
    share.mockRestore();
  });
});
