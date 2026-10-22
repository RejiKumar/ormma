/* global jest */
// Manual mock for @react-native-firebase/firestore (modular API).
// References are chainable no-ops; tests override the jest.fn()s they care about.

function makeRef(path) {
  const ref = {
    id: path.split("/").filter(Boolean).pop() || "",
    path,
    parent: null,
    collection: jest.fn((segment) => makeRef(`${path}/${segment}`)),
    doc: jest.fn((segment) => makeRef(`${path}/${segment}`)),
    where: jest.fn(() => ref),
    orderBy: jest.fn(() => ref),
    limit: jest.fn(() => ref),
    withConverter: jest.fn(() => ref),
    get: jest.fn(() =>
      Promise.resolve({
        id: ref.id,
        ref,
        exists: () => false,
        data: () => undefined,
      }),
    ),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
    onSnapshot: jest.fn(() => jest.fn()),
  };
  return ref;
}

const emptyDocSnap = { id: "", exists: () => false, data: () => undefined };
const emptyColSnap = { docs: [], size: 0, empty: true, docChanges: () => [] };

const root = makeRef("");

const api = {
  getFirestore: jest.fn(() => root),
  firestore: jest.fn(() => root),
  collection: jest.fn((_db, ...segments) => makeRef(segments.join("/"))),
  doc: jest.fn((_db, ...segments) => makeRef(segments.join("/"))),
  documentId: jest.fn(() => ({ type: "documentId" })),
  query: jest.fn((value) => value),
  where: jest.fn(() => jest.fn()),
  orderBy: jest.fn(() => jest.fn()),
  limit: jest.fn(() => jest.fn()),
  getDoc: jest.fn(() => Promise.resolve(emptyDocSnap)),
  getDocs: jest.fn(() => Promise.resolve(emptyColSnap)),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn(() => jest.fn()),
  Timestamp: {
    now: () => ({ seconds: 0, nanoseconds: 0, toDate: () => new Date(0), toMillis: () => 0 }),
  },
  // Test helpers (not part of the real package).
  /** Reset every jest.fn() above and re-apply its default implementation. */
  __resetFirestore() {
    const defaults = new Map([
      [api.getFirestore, () => root],
      [api.firestore, () => root],
      [api.collection, (_db, ...segments) => makeRef(segments.join("/"))],
      [api.doc, (_db, ...segments) => makeRef(segments.join("/"))],
      [api.documentId, () => ({ type: "documentId" })],
      [api.query, (value) => value],
      [api.where, () => jest.fn()],
      [api.orderBy, () => jest.fn()],
      [api.limit, () => jest.fn()],
      [api.getDoc, () => Promise.resolve(emptyDocSnap)],
      [api.getDocs, () => Promise.resolve(emptyColSnap)],
      [api.setDoc, () => Promise.resolve()],
      [api.updateDoc, () => Promise.resolve()],
      [api.deleteDoc, () => Promise.resolve()],
      [api.onSnapshot, () => jest.fn()],
    ]);
    for (const [fn, impl] of defaults) {
      fn.mockReset();
      fn.mockImplementation(impl);
    }
  },
};

module.exports = api;
