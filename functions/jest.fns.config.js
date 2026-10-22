/** Jest config for the emulator-based callable tests (run with `npm run test:fns` from the repo root). */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test/fns"],
  testTimeout: 60000,
  transform: { "^.+[.][tj]sx?$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }] },
  transformIgnorePatterns: ["/node_modules/(?!jose/)"],
};
