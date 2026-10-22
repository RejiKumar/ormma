/* global jest */
// Manual mock for @react-native-firebase/functions (modular API).
// Tests override httpsCallable per case:
//   const fns = jest.requireMock("@react-native-firebase/functions");
//   fns.__callables.createParent.mockResolvedValue({ data: { parentId: "p1" } });

const callables = {};

function httpsCallable(_functions, name) {
  if (!callables[name]) {
    callables[name] = jest.fn(() => Promise.resolve({ data: undefined }));
  }
  return callables[name];
}

const functionsInstance = { name: "[DEFAULT]", region: "asia-south1" };

module.exports = {
  getFunctions: jest.fn(() => functionsInstance),
  httpsCallable,
  httpsCallableFromURL: jest.fn((name) => httpsCallable(functionsInstance, name)),
  // Test helpers (not part of the real package).
  __callables: callables,
  __resetCallables() {
    for (const key of Object.keys(callables)) delete callables[key];
  },
};
