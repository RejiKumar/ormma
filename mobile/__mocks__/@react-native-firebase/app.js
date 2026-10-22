/* global jest */
// Manual mock for @react-native-firebase/app: tests never load native code.
const defaultApp = { name: "[DEFAULT]", options: {} };

module.exports = {
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => defaultApp),
  getFunctions: jest.fn(),
  initializeApp: jest.fn(() => defaultApp),
  // Namespaced escape hatch: firebase.app()
  app: jest.fn(() => defaultApp),
};
