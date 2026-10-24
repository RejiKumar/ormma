import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { useParents } from "./useParents";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FirestoreMock = {
  onSnapshot: jest.Mock;
  getDoc: jest.Mock;
  where: jest.Mock;
  query: jest.Mock;
};
const fsMock = jest.requireMock("@react-native-firebase/firestore") as FirestoreMock;

type AuthMock = { __setUser: (user: { uid: string; phoneNumber: string | null }) => void };
const authMock = jest.requireMock("@react-native-firebase/auth") as AuthMock;

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;

interface SnapshotListener {
  next: (snap: unknown) => void;
  error: (err: unknown) => void;
}

/** Capture every onSnapshot listener the hook registers, in subscription order. */
function captureListeners(): SnapshotListener[] {
  const captured: SnapshotListener[] = [];
  fsMock.onSnapshot.mockImplementation((_q: unknown, next: (s: unknown) => void, error: (e: unknown) => void) => {
    captured.push({ next, error });
    return jest.fn();
  });
  return captured;
}

const parentDoc = (name: string, status: string, extra: Record<string, unknown> = {}) => ({
  docs: [
    {
      id: "p1",
      data: () => ({ name, language: "ml-IN", consent: { status }, ...extra }),
    },
  ],
});

describe("useParents", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });
  });

  it("returns an empty, non-loading list when the device knows no parent ids", async () => {
    captureListeners();
    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.parents).toEqual([]);
    expect(fsMock.onSnapshot).not.toHaveBeenCalled();
  });

  it("subscribes only to the known ids (documentId-in, decision #57) and maps the snapshot", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const listeners = captureListeners();
    fsMock.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: "owner" }) });

    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(fsMock.where).toHaveBeenCalledWith(expect.anything(), "in", ["p1"]);

    await act(async () => {
      listeners[0].next(parentDoc("Amma", "pending"));
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.parents).toEqual([
      {
        id: "p1",
        name: "Amma",
        phone: "",
        language: "ml-IN",
        timezone: "Asia/Kolkata",
        consent: { status: "pending", revokedAt: null, regrantedAt: null },
        role: "owner",
      },
    ]);
  });

  it("maps a granted consent and a null role when the membership doc is missing", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const listeners = captureListeners();
    fsMock.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].next(
        parentDoc("Amma", "granted", {
          timezone: "Asia/Kolkata",
          consent: {
            status: "granted",
            revokedAt: { toMillis: () => 1_792_607_400_000 },
            regrantedAt: null,
          },
        }),
      );
    });
    await waitFor(() => expect(result.current.parents).toHaveLength(1));
    expect(result.current.parents[0]).toMatchObject({
      timezone: "Asia/Kolkata",
      consent: { status: "granted", revokedAt: 1_792_607_400_000, regrantedAt: null },
      role: null,
    });
  });

  it("surfaces a missing consent map as null (fail closed for dated queries)", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const listeners = captureListeners();
    fsMock.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].next({
        docs: [{ id: "p1", data: () => ({ name: "Amma", language: "ml-IN" }) }],
      });
    });
    await waitFor(() => expect(result.current.parents).toHaveLength(1));
    expect(result.current.parents[0].consent).toBeNull();
    expect(result.current.parents[0].timezone).toBe("Asia/Kolkata");
  });

  it("chunks more than 30 ids into several in-queries", async () => {
    const ids = Array.from({ length: 31 }, (_, i) => `p${i}`);
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(ids));
    captureListeners();
    fsMock.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(2));
    const chunkArgs = fsMock.where.mock.calls.map((c: unknown[]) => c[2] as string[]);
    expect(chunkArgs[0]).toHaveLength(30);
    expect(chunkArgs[1]).toHaveLength(1);
  });

  it("stops loading when the snapshot errors, and logs only the code", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    const listeners = captureListeners();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].error({ code: "permission-denied" });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.parents).toEqual([]);
    expect(warn).toHaveBeenCalledWith("parents snapshot failed code=permission-denied");
    warn.mockRestore();
  });

  it("re-subscribes on reload, re-reading the stored ids", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
    captureListeners();
    fsMock.getDoc.mockResolvedValue({ exists: () => false, data: () => undefined });

    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(1));

    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1", "p2"]));
    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(fsMock.onSnapshot).toHaveBeenCalledTimes(2));
    const lastChunk = fsMock.where.mock.calls.at(-1)?.[2] as string[];
    expect(lastChunk).toEqual(["p1", "p2"]);
  });
});
