/* global jest */
// Manual mock for the Google ML Kit document scanner. Tests choose what scanDocument resolves.
const scanDocument = jest.fn(() => Promise.resolve({ status: "cancel" }));

module.exports = {
  __esModule: true,
  default: { scanDocument },
  ResponseType: { Base64: "base64", ImageFilePath: "imageFilePath" },
  ScanDocumentResponseStatus: { Success: "success", Cancel: "cancel" },
};
