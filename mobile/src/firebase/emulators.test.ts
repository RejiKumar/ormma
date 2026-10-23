import {
  connectAuthEmulator,
  connectEmulators,
  connectModuleEmulator,
  currentEmulatorFlags,
  emulatorHost,
  EMULATOR_PORTS,
  type EmulatorFlags,
} from "./emulators";

const flags = (overrides: Partial<EmulatorFlags> = {}): EmulatorFlags => ({
  dev: true,
  isJest: false,
  host: "10.0.2.2",
  ...overrides,
});

describe("emulatorHost", () => {
  it("returns the configured host, defaulting to localhost", () => {
    expect(emulatorHost(flags())).toBe("10.0.2.2");
    expect(emulatorHost(flags({ host: undefined }))).toBe("localhost");
    expect(emulatorHost(flags({ host: "" }))).toBe("localhost");
  });

  it("is null in production builds and under Jest", () => {
    expect(emulatorHost(flags({ dev: false }))).toBeNull();
    expect(emulatorHost(flags({ isJest: true }))).toBeNull();
  });
});

describe("connectModuleEmulator", () => {
  it("connects Firestore and Functions with host + port", () => {
    const target = { useEmulator: jest.fn() };
    expect(connectModuleEmulator(target, EMULATOR_PORTS.firestore, flags())).toBe(true);
    expect(target.useEmulator).toHaveBeenCalledWith("10.0.2.2", 8080);
    expect(connectModuleEmulator(target, EMULATOR_PORTS.functions, flags())).toBe(true);
    expect(target.useEmulator).toHaveBeenLastCalledWith("10.0.2.2", 5001);
  });

  it("does nothing when disabled, even for a real module object", () => {
    const target = { useEmulator: jest.fn() };
    expect(connectModuleEmulator(target, 8080, flags({ dev: false }))).toBe(false);
    expect(connectModuleEmulator(target, 8080, flags({ isJest: true }))).toBe(false);
    expect(target.useEmulator).not.toHaveBeenCalled();
  });

  it("skips modules without useEmulator or null targets", () => {
    expect(connectModuleEmulator(null, 8080, flags())).toBe(false);
    expect(connectModuleEmulator({}, 8080, flags())).toBe(false);
  });
});

describe("connectAuthEmulator", () => {
  it("passes the auth emulator a URL", () => {
    const target = { useEmulator: jest.fn() };
    expect(connectAuthEmulator(target, EMULATOR_PORTS.auth, flags())).toBe(true);
    expect(target.useEmulator).toHaveBeenCalledWith("http://10.0.2.2:9099");
  });

  it("never connects under Jest", () => {
    const target = { useEmulator: jest.fn() };
    expect(connectAuthEmulator(target, EMULATOR_PORTS.auth, flags({ isJest: true }))).toBe(false);
    expect(target.useEmulator).not.toHaveBeenCalled();
  });
});

describe("Jest environment", () => {
  it("detects Jest and the real connectEmulators is a no-op here", () => {
    expect(currentEmulatorFlags().isJest).toBe(true);
    expect(() => connectEmulators()).not.toThrow();
  });
});
