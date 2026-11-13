/* global jest */
// Manual mock for @react-native-firebase/storage (modular API).
const storageInstance = { app: { name: "[DEFAULT]" } };

module.exports = {
  getStorage: jest.fn(() => storageInstance),
  ref: jest.fn((_storage, path) => ({ fullPath: path })),
  putFile: jest.fn(() => Promise.resolve({})),
  deleteObject: jest.fn(() => Promise.resolve()),
};
