import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { useMedicines } from "./useMedicines";

type FirestoreMock = { onSnapshot: jest.Mock; orderBy: jest.Mock; collection: jest.Mock };
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

interface SnapshotListener {
  next: (snap: unknown) => void;
  error: (err: unknown) => void;
}

function captureListeners(): SnapshotListener[] {
  const captured: SnapshotListener[] = [];
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void, error: (e: unknown) => void) => {
    captured.push({ next, error });
    return jest.fn();
  });
  return captured;
}

const medicineDocs = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

describe("useMedicines", () => {
  beforeEach(async () => {
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
  });

  it("subscribes to nothing without a parentId and stays idle", async () => {
    captureListeners();
    const { result } = await renderHook(() => useMedicines(null), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.medicines).toEqual([]);
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
  });

  it("subscribes ordered by name and maps the snapshot fields", async () => {
    const listeners = captureListeners();
    const { result } = await renderHook(() => useMedicines("p1"), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(fsMock.collection).toHaveBeenCalledWith(expect.anything(), "parents", "p1", "medicines");
    expect(fsMock.orderBy).toHaveBeenCalledWith("name", "asc");

    await act(async () => {
      listeners[0].next(
        medicineDocs([
          {
            id: "m1",
            data: {
              name: "Amlodipine",
              doseText: "5 mg, after food",
              times: ["08:00", "20:00"],
              startDate: "2026-10-01",
              endDate: null,
              active: true,
              source: "manual",
              confirmedByHuman: true,
              prescriptionId: null,
              createdBy: "u1",
            },
          },
          {
            id: "m2",
            data: {
              name: "Vitamin D",
              doseText: "",
              times: ["09:00"],
              startDate: "2026-10-01",
              endDate: "2026-12-31",
              active: false,
              source: "prescription_scan",
              confirmedByHuman: false,
              prescriptionId: "rx9",
              createdBy: "u2",
            },
          },
        ]),
      );
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.medicines).toEqual([
      {
        id: "m1",
        name: "Amlodipine",
        doseText: "5 mg, after food",
        times: ["08:00", "20:00"],
        startDate: "2026-10-01",
        endDate: null,
        active: true,
        source: "manual",
        confirmedByHuman: true,
        prescriptionId: null,
        createdBy: "u1",
      },
      {
        id: "m2",
        name: "Vitamin D",
        doseText: "",
        times: ["09:00"],
        startDate: "2026-10-01",
        endDate: "2026-12-31",
        active: false,
        source: "prescription_scan",
        confirmedByHuman: false,
        prescriptionId: "rx9",
        createdBy: "u2",
      },
    ]);
  });

  it("falls back safely when a document has partial fields", async () => {
    const listeners = captureListeners();
    const { result } = await renderHook(() => useMedicines("p1"), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].next(medicineDocs([{ id: "m1", data: { name: "X", times: ["bad", 3] } }]));
    });
    await waitFor(() => expect(result.current.medicines).toHaveLength(1));
    expect(result.current.medicines[0]).toMatchObject({
      name: "X",
      times: ["bad"],
      active: true,
      source: "manual",
      confirmedByHuman: false,
      endDate: null,
      prescriptionId: null,
    });
  });

  it("unsubscribes on unmount", async () => {
    const unsubscribe = jest.fn();
    fsMock.onSnapshot.mockImplementation(() => unsubscribe);
    const { unmount } = await renderHook(() => useMedicines("p1"), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));
    await act(async () => {
      await unmount();
    });
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("stops loading on snapshot error and logs only the code", async () => {
    const listeners = captureListeners();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { result } = await renderHook(() => useMedicines("p1"), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].error({ code: "permission-denied" });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.medicines).toEqual([]);
    expect(warn).toHaveBeenCalledWith("medicines snapshot failed code=permission-denied");
    warn.mockRestore();
  });

  it("resubscribes when the parent changes", async () => {
    captureListeners();
    const { result, rerender } = await renderHook(({ id }: { id: string | null }) => useMedicines(id), {
      wrapper,
      initialProps: { id: "p1" as string | null },
    });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));
    await act(async () => {
      rerender({ id: "p2" });
    });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(2));
    expect(fsMock.collection).toHaveBeenLastCalledWith(expect.anything(), "parents", "p2", "medicines");
    expect(result.current.loading).toBe(true);
  });
});
