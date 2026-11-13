import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { AuthProvider } from "../../auth/AuthProvider";
import { ScanPrescriptionScreen } from "./ScanPrescriptionScreen";
import { renderApp } from "../../test-utils";

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;
type FirestoreMock = { onSnapshot: jest.Mock; getDoc: jest.Mock; setDoc: jest.Mock };
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;
const fnsMock = jest.requireMock("@react-native-firebase/functions") as {
  __callables: Record<string, jest.Mock>;
  __resetCallables: () => void;
  httpsCallable: (functions: unknown, name: string) => jest.Mock;
};
/** The callables mock creates an entry the first time a name is asked for. */
const callable = (name: string) => fnsMock.httpsCallable(null, name);
const storageMock = jest.requireMock("@react-native-firebase/storage") as {
  putFile: jest.Mock;
  deleteObject: jest.Mock;
};
const scannerMock = jest.requireMock("react-native-document-scanner-plugin") as {
  default: { scanDocument: jest.Mock };
};

const docSnap = (data: Record<string, unknown> | undefined) => ({ exists: () => data !== undefined, data: () => data });

const listeners: Record<string, (event: unknown) => void> = {};
const navigation = {
  goBack: jest.fn(),
  replace: jest.fn(),
  dispatch: jest.fn(),
  navigate: jest.fn(),
  addListener: jest.fn((name: string, cb: (event: unknown) => void) => {
    listeners[name] = cb;
    return jest.fn();
  }),
};

const medicines = [
  { name: "Metformin", doseText: "500mg", frequencyText: "Twice daily", times: ["08:00", "20:00"], confidence: 0.9, illegible: false },
  { name: "Amlodpin", doseText: "5", frequencyText: null, times: null, confidence: 0.3, illegible: true },
];

const renderScan = () =>
  renderApp(
    <AuthProvider>
      <ScanPrescriptionScreen
        navigation={navigation as never}
        route={{ key: "ScanPrescription", name: "ScanPrescription", params: { parentId: "p1" } } as never}
      />
    </AuthProvider>,
  );

const scanReturnsPage = () =>
  scannerMock.default.scanDocument.mockResolvedValue({ status: "success", scannedImages: ["file:///page.jpg"] });
const readReturns = (medicineCount: number) =>
  callable("scanPrescription").mockResolvedValue({
    data: { prescriptionId: "rx1", status: "pending_review", hasExtract: true, medicineCount },
  });

describe("ScanPrescriptionScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
    fnsMock.__resetCallables();
    for (const fn of [navigation.goBack, navigation.replace, navigation.dispatch, storageMock.putFile, storageMock.deleteObject, scannerMock.default.scanDocument, fsMock.setDoc]) {
      fn.mockClear();
    }
    storageMock.putFile.mockResolvedValue({});
    fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void) => {
      next({ docs: [{ id: "p1", data: () => ({ name: "Amma", language: "ml-IN", timezone: "Asia/Kolkata", consent: { status: "granted" } }) }] });
      return jest.fn();
    });
    fsMock.getDoc.mockImplementation((ref: { path?: string }) => {
      const path = String(ref?.path ?? "");
      if (path === "parents/p1/prescriptions/rx1") return Promise.resolve(docSnap({ extracted: { medicines } }));
      if (path === "parents/p1/members/u1") return Promise.resolve(docSnap({ role: "editor" }));
      if (path.includes("users/u1")) return Promise.resolve(docSnap({ displayName: "", phone: "+919876543210", fcmTokens: [], createdAt: {} }));
      return Promise.resolve(docSnap(undefined));
    });
  });

  it("goes back without uploading when the scanner is closed", async () => {
    scannerMock.default.scanDocument.mockResolvedValue({ status: "cancel" });
    await renderScan();
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(storageMock.putFile).not.toHaveBeenCalled();
  });

  it("says scanning is not available and offers manual entry", async () => {
    scannerMock.default.scanDocument.mockRejectedValue(new Error("no play services"));
    await renderScan();
    expect(await screen.findByText("Scanning is not available on this phone. You can still add medicines by hand.")).toBeTruthy();
    expect(screen.queryByTestId("scan-retry")).toBeNull();
    await fireEvent.press(screen.getByTestId("scan-enter-by-hand"));
    expect(navigation.replace).toHaveBeenCalledWith("AddMedicine", { parentId: "p1" });
  });

  it("uploads into the parent's folder, reads it and shows each medicine as read with nothing created", async () => {
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    expect(await screen.findByTestId("review-rx1-0")).toBeTruthy();

    const [, uploadedFrom] = storageMock.putFile.mock.calls[0];
    expect(uploadedFrom).toBe("file:///page.jpg");
    const readCall = callable("scanPrescription").mock.calls[0][0];
    expect(readCall.parentId).toBe("p1");
    expect(readCall.storagePath).toMatch(/^prescriptions\/p1\/[\w-]+\.jpg$/);

    // Names exactly as read, never corrected; the unclear one carries the neutral marker.
    expect(screen.getByTestId("review-rx1-0-name").props.value).toBe("Metformin");
    expect(screen.getByTestId("review-rx1-1-name").props.value).toBe("Amlodpin");
    expect(screen.queryByTestId("review-rx1-0-check")).toBeNull();
    expect(screen.getByTestId("review-rx1-1-check")).toBeTruthy();
    expect(screen.getByText("Check this one")).toBeTruthy();
    // Times the page stated are shown; no time stated stays empty; the start date starts empty.
    expect(screen.getByTestId("review-rx1-0-time-0").props.value).toBe("08:00");
    expect(screen.getByTestId("review-rx1-1-time-0").props.value).toBe("");
    expect(screen.getByTestId("review-rx1-0-start").props.value).toBe("");
    expect(screen.getByText("This app does not provide medical advice.")).toBeTruthy();
    // Nothing is created before Confirm.
    expect(fnsMock.__callables.confirmPrescriptionMedicine).toBeUndefined();
  });

  it("keeps Confirm disabled until a valid time and start date are entered, then confirms with those values", async () => {
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    await screen.findByTestId("review-rx1-1");
    const confirmCall = jest.fn().mockResolvedValue({ data: { medicineId: "m1" } });
    fnsMock.__callables.confirmPrescriptionMedicine = confirmCall;

    const confirmButton = () => screen.getByTestId("review-rx1-1-confirm");
    expect(confirmButton().props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId("review-rx1-1-time-0"), "9am");
    await fireEvent.press(screen.getByTestId("review-rx1-1-today"));
    expect(confirmButton().props.accessibilityState?.disabled).toBe(true);
    await fireEvent.changeText(screen.getByTestId("review-rx1-1-time-0"), "09:30");
    expect(confirmButton().props.accessibilityState?.disabled).toBeFalsy();

    await fireEvent.press(confirmButton());
    await waitFor(() => expect(confirmCall).toHaveBeenCalledTimes(1));
    const sent = confirmCall.mock.calls[0][0];
    expect(sent.parentId).toBe("p1");
    expect(sent.prescriptionId).toBe("rx1");
    expect(sent.medicine).toEqual({ name: "Amlodpin", doseText: "5", frequencyText: "", times: ["09:30"] });
    expect(sent.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await screen.findByTestId("review-rx1-1-confirmed")).toBeTruthy();
  });

  it("ends the review, deletes the image and goes back once every card is confirmed or discarded", async () => {
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    await screen.findByTestId("review-rx1-0");
    fnsMock.__callables.confirmPrescriptionMedicine = jest.fn().mockResolvedValue({ data: { medicineId: "m1" } });

    await fireEvent.changeText(screen.getByTestId("review-rx1-0-start"), "2026-11-14");
    await fireEvent.press(screen.getByTestId("review-rx1-0-confirm"));
    await screen.findByTestId("review-rx1-0-confirmed");
    expect(navigation.goBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("review-rx1-1-discard"));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(storageMock.deleteObject).toHaveBeenCalledTimes(1);
    // Something was confirmed, so the prescription is not marked rejected.
    expect(fsMock.setDoc).not.toHaveBeenCalled();
  });

  it("marks the prescription rejected when nothing was confirmed", async () => {
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    await screen.findByTestId("review-rx1-0");
    await fireEvent.press(screen.getByTestId("review-rx1-0-discard"));
    await fireEvent.press(screen.getByTestId("review-rx1-1-discard"));
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(fsMock.setDoc.mock.calls[0][1]).toEqual({ status: "rejected" });
  });

  it("shows a calm message and keeps the card open when a confirmation fails", async () => {
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    await screen.findByTestId("review-rx1-0");
    fnsMock.__callables.confirmPrescriptionMedicine = jest.fn().mockRejectedValue({ code: "functions/internal" });
    await fireEvent.changeText(screen.getByTestId("review-rx1-0-start"), "2026-11-14");
    await fireEvent.press(screen.getByTestId("review-rx1-0-confirm"));
    expect(await screen.findByText("Could not add this medicine. Please try again.")).toBeTruthy();
    expect(screen.queryByTestId("review-rx1-0-confirmed")).toBeNull();
  });

  it("asks before leaving with open cards, and leaving creates nothing", async () => {
    scanReturnsPage();
    readReturns(2);
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await renderScan();
    await screen.findByTestId("review-rx1-0");
    const preventDefault = jest.fn();
    const action = { type: "GO_BACK" };
    listeners.beforeRemove({ preventDefault, data: { action } });
    expect(preventDefault).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    buttons.find((b) => b.text === "Leave")?.onPress?.();
    expect(navigation.dispatch).toHaveBeenCalledWith(action);
    expect(fnsMock.__callables.confirmPrescriptionMedicine).toBeUndefined();
    alertSpy.mockRestore();
  });

  it.each([
    ["the page cannot be uploaded", () => storageMock.putFile.mockRejectedValue(new Error("offline")), "The page could not be uploaded. Check your connection.", "Try again"],
    ["the reading fails", () => callable("scanPrescription").mockRejectedValue({ code: "functions/internal" }), "The prescription could not be read.", "Try again"],
    [
      "the server could not read the page",
      () => callable("scanPrescription").mockResolvedValue({ data: { prescriptionId: "rx1", status: "pending_review", hasExtract: false, medicineCount: 0 } }),
      "The prescription could not be read.",
      "Try again",
    ],
    ["no medicine is found", () => readReturns(0), "No medicine was found on this page.", "Scan again"],
  ])("shows a neutral message when %s", async (_name, arrange, message, retry) => {
    scanReturnsPage();
    readReturns(2);
    arrange();
    await renderScan();
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.getByText(retry)).toBeTruthy();
    expect(screen.getByTestId("scan-enter-by-hand")).toBeTruthy();
    expect(fnsMock.__callables.confirmPrescriptionMedicine).toBeUndefined();
  });

  it("never logs a medicine, a dose or the image", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((level) => jest.spyOn(console, level).mockImplementation(() => undefined));
    scanReturnsPage();
    readReturns(2);
    await renderScan();
    await screen.findByTestId("review-rx1-0");
    fnsMock.__callables.confirmPrescriptionMedicine = jest.fn().mockRejectedValue({ code: "functions/internal" });
    await fireEvent.changeText(screen.getByTestId("review-rx1-0-start"), "2026-11-14");
    await fireEvent.press(screen.getByTestId("review-rx1-0-confirm"));
    await screen.findByText("Could not add this medicine. Please try again.");
    const logged = spies.flatMap((spy) => spy.mock.calls.flat().map(String)).join(" ");
    expect(logged).not.toMatch(/Metformin|500mg|page\.jpg|Amlodpin/);
    spies.forEach((spy) => spy.mockRestore());
  });
});
