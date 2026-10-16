/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  // jose (pulled in by firebase-admin) is ESM-only; transform it so Jest can load it as CommonJS.
  transform: { "^.+[.][tj]sx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }] },
  transformIgnorePatterns: ["/node_modules/(?!jose/)"],
};
