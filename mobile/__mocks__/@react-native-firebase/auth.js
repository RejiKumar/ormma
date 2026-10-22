/* global jest */
// Manual mock for @react-native-firebase/auth (modular API).
// Tests control auth state with __setUser / __emitAuthState via jest.requireMock:
//   const authMock = jest.requireMock("@react-native-firebase/auth");
//   authMock.__setUser({ uid: "u1", phoneNumber: "+919876543210" });

const listeners = new Set();
let currentUser = null;

const authInstance = { name: "[DEFAULT]", currentUser: null };

function onAuthStateChanged(_auth, listener) {
  listeners.add(listener);
  // Firebase notifies the current state as soon as a listener subscribes.
  listener(currentUser);
  return () => listeners.delete(listener);
}

const signInWithPhoneNumber = jest.fn(() =>
  Promise.resolve({
    confirm: jest.fn(() => Promise.resolve({ user: { uid: "mocked_user", phoneNumber: "+919876543210" } })),
  }),
);

module.exports = {
  getAuth: jest.fn(() => authInstance),
  initializeAuth: jest.fn(() => authInstance),
  onAuthStateChanged: jest.fn(onAuthStateChanged),
  onIdTokenChanged: jest.fn(onAuthStateChanged),
  signInWithPhoneNumber,
  // Test helpers (not part of the real package).
  __setUser(user) {
    currentUser = user;
  },
  __emitAuthState(user) {
    currentUser = user;
    for (const listener of [...listeners]) listener(user);
  },
  __resetAuth() {
    currentUser = null;
    listeners.clear();
    signInWithPhoneNumber.mockClear();
    signInWithPhoneNumber.mockImplementation(() =>
      Promise.resolve({
        confirm: jest.fn(() => Promise.resolve({ user: { uid: "mocked_user", phoneNumber: "+919876543210" } })),
      }),
    );
    module.exports.onAuthStateChanged.mockClear();
  },
};
