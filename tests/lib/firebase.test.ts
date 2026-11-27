import { afterEach, describe, expect, it, vi } from "vitest";

// tests/setup.ts swaps @/lib/firebase for empty objects; here we test the real file,
// with the Firebase SDK itself faked so nothing connects anywhere.
vi.unmock("@/lib/firebase");

const initializeFirestore = vi.fn(() => ({ kind: "configured" }));
const getFirestore = vi.fn(() => ({ kind: "existing" }));
vi.mock("firebase/app", () => ({ getApps: () => [], getApp: vi.fn(), initializeApp: () => ({ name: "app" }) }));
vi.mock("firebase/auth", () => ({ getAuth: () => ({}), connectAuthEmulator: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: (...args: unknown[]) => initializeFirestore(...(args as [])),
  getFirestore: (...args: unknown[]) => getFirestore(...(args as [])),
  connectFirestoreEmulator: vi.fn(),
}));

afterEach(() => {
  vi.resetModules();
  initializeFirestore.mockClear();
  getFirestore.mockClear();
});

describe("Firestore setup", () => {
  it("uses long polling, so networks that hold back streams still get data", async () => {
    const { db, FIRESTORE_SETTINGS } = await import("@/lib/firebase");

    expect(FIRESTORE_SETTINGS).toEqual({ experimentalForceLongPolling: true });
    expect(initializeFirestore).toHaveBeenCalledWith({ name: "app" }, FIRESTORE_SETTINGS);
    expect(db).toEqual({ kind: "configured" });
  });

  it("reuses the existing Firestore when it was already set up (hot reload)", async () => {
    initializeFirestore.mockImplementationOnce(() => {
      throw new Error("initializeFirestore() has already been called");
    });
    const { db } = await import("@/lib/firebase");

    expect(getFirestore).toHaveBeenCalled();
    expect(db).toEqual({ kind: "existing" });
  });
});
