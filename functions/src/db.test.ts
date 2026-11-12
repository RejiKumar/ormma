import { deleteApp, getApp, getApps, initializeApp } from "firebase-admin/app";
import { ensureAdminApp, getDb } from "./db";

describe("ensureAdminApp", () => {
  afterEach(async () => {
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  it("creates the default app when none exists", () => {
    expect(getApps()).toHaveLength(0);
    ensureAdminApp();
    expect(getApp().name).toBe("[DEFAULT]");
  });

  it("still creates the default app when only a named app exists (the production failure)", () => {
    initializeApp({ projectId: "demo-ormma" }, "someone-else");
    expect(getApps()).toHaveLength(1);
    ensureAdminApp();
    expect(getApp().name).toBe("[DEFAULT]");
    expect(getApps()).toHaveLength(2);
  });

  it("does not create a second default app on repeated calls", () => {
    ensureAdminApp();
    ensureAdminApp();
    expect(getApps()).toHaveLength(1);
  });

  it("getDb works when only a named app existed before", () => {
    initializeApp({ projectId: "demo-ormma" }, "someone-else");
    expect(() => getDb()).not.toThrow();
  });
});
