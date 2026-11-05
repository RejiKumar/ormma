import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../auth/AuthProvider";
import { ParentsProvider, useParents } from "./useParents";
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

  it("recovers parent ids from the server after a reinstall (empty local list)", async () => {
    const fns = jest.requireMock("@react-native-firebase/functions") as {
      __callables: Record<string, jest.Mock>;
      httpsCallable: (f: unknown, name: string) => jest.Mock;
    };
    fns.httpsCallable({}, "listMyParents").mockResolvedValue({ data: { parentIds: ["p9"] } });
    fsMock.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: "owner" }) });

    const listeners = captureListeners();
    const { result } = await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(fsMock.where).toHaveBeenCalledWith(expect.anything(), "in", ["p9"]);
    expect(await AsyncStorage.getItem("ormma.parentIds")).toBe(JSON.stringify(["p9"]));

    await act(async () => {
      listeners[0].next({
        docs: [
          {
            id: "p9",
            data: () => ({ name: "Amma", language: "ml-IN", consent: { status: "granted" } }),
          },
        ],
      });
    });
    await waitFor(() => expect(result.current.parents).toHaveLength(1));
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
        emergencyContacts: [],
        city: "",
        prescriber: "",
        refillDue: null,
        callPolicy: { retryCount: 2, retryGapMinutes: 10, missedAfterMinutes: 60 },
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

  it("forgets a stored id the member can no longer read, then re-subscribes with the rest", async () => {
    await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["gone", "p2"]));
    const listeners = captureListeners();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    // The deleted parent is denied; the other one is readable.
    fsMock.getDoc.mockImplementation((ref: { path?: string; id?: string }) => {
      const id = ref?.id ?? ref?.path?.split("/").pop();
      if (id === "gone") return Promise.reject({ code: "firestore/permission-denied" });
      return Promise.resolve({ exists: () => true, data: () => ({ role: "owner" }) });
    });

    await renderHook(() => useParents(), { wrapper });
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => {
      listeners[0].error({ code: "firestore/permission-denied" });
    });

    await waitFor(async () =>
      expect(JSON.parse((await AsyncStorage.getItem("ormma.parentIds")) ?? "[]")).toEqual(["p2"]),
    );
    // A second subscription is made for the remaining id.
    await waitFor(() => expect(listeners.length).toBeGreaterThan(1));
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

  describe("shared loading and the server sync", () => {
    const fns = jest.requireMock("@react-native-firebase/functions") as {
      __callables: Record<string, jest.Mock>;
      httpsCallable: (f: unknown, name: string) => jest.Mock;
    };
    const listMine = () => {
      fns.httpsCallable(undefined, "listMyParents");
      return fns.__callables.listMyParents;
    };

    it("shows the local parents at once and syncs with the server in the background, once", async () => {
      await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
      let release: (value: { data: { parentIds: string[] } }) => void = () => undefined;
      listMine().mockReset();
      listMine().mockImplementation(() => new Promise((resolve) => { release = resolve; }));
      const listeners = captureListeners();
      const { result } = await renderHook(() => useParents(), { wrapper });
      // The server has not answered, yet the parents list is already being loaded from local ids.
      await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
      expect(listMine()).toHaveBeenCalledTimes(1);
      await act(async () => {
        release({ data: { parentIds: ["p1"] } });
      });
      expect(result.current.loading).toBeDefined();
      expect(listMine()).toHaveBeenCalledTimes(1);
    });

    it("waits for the server when nothing is stored locally", async () => {
      listMine().mockReset();
      listMine().mockResolvedValue({ data: { parentIds: [] } });
      const { result } = await renderHook(() => useParents(), { wrapper });
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(listMine()).toHaveBeenCalledTimes(1);
    });

    it("lets many screens share one loader: one server call and one set of listeners", async () => {
      await AsyncStorage.setItem("ormma.parentIds", JSON.stringify(["p1"]));
      listMine().mockReset();
      listMine().mockResolvedValue({ data: { parentIds: ["p1"] } });
      const listeners = captureListeners();
      const shared = ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>
          <ParentsProvider>{children}</ParentsProvider>
        </AuthProvider>
      );
      const { result } = await renderHook(() => [useParents(), useParents(), useParents(), useParents(), useParents()], {
        wrapper: shared,
      });
      await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
      expect(listMine()).toHaveBeenCalledTimes(1);
      expect(listeners).toHaveLength(1);
      // Every consumer sees the same value.
      expect(new Set(result.current.map((r) => r.parents)).size).toBe(1);
    });
  });
});
