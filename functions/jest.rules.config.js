/** Jest config for the emulator-based rules tests (run with `npm run test:rules` from the repo root). */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test/rules"],
  testTimeout: 60000,
  transform: { "^.+[.][tj]sx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }] },
  transformIgnorePatterns: ["/node_modules/(?!jose/)"],
};
