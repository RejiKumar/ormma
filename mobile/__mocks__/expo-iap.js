/* global jest */
// Manual mock for expo-iap (native module). Screens are tested with a fake `Billing`; this only lets
// modules that import the real wrapper load under Jest.
module.exports = {
  initConnection: jest.fn(() => Promise.resolve(true)),
  fetchProducts: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve(null)),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  finishTransaction: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
};
