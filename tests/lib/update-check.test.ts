import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake Remote Config SDK, so no test talks to Firebase
const sdk = vi.hoisted(() => ({
  isSupported: vi.fn(),
  getRemoteConfig: vi.fn(),
  fetchAndActivate: vi.fn(),
  getString: vi.fn(),
}));
vi.mock("firebase/remote-config", () => sdk);

const RUNNING = "ac8e549aac241ccc641823231391589c42f9fe7e";
const NEWER = "515cd49f3e2b6d1a0c9e8f7a6b5c4d3e2f1a0b9c";

// A fresh copy of the module each time, because it keeps the Remote Config instance
async function load() {
  vi.resetModules();
  return import("@/lib/updateCheck");
}

beforeEach(() => {
  sdk.isSupported.mockResolvedValue(true);
  sdk.getRemoteConfig.mockReturnValue({ settings: {}, defaultConfig: {} });
  sdk.fetchAndActivate.mockResolvedValue(true);
  sdk.getString.mockReturnValue(NEWER);
});

afterEach(() => vi.clearAllMocks());

describe("checkForUpdate", () => {
  it("returns the published version when it's newer than this build", async () => {
    const { checkForUpdate, MIN_FETCH_INTERVAL_MS } = await load();
    expect(await checkForUpdate(RUNNING)).toBe(NEWER);
    expect(sdk.getString).toHaveBeenCalledWith(expect.anything(), "latest_version");
    // Fetches at most every 30 minutes
    const config = sdk.getRemoteConfig.mock.results[0].value;
    expect(config.settings.minimumFetchIntervalMillis).toBe(MIN_FETCH_INTERVAL_MS);
    expect(MIN_FETCH_INTERVAL_MS).toBe(30 * 60_000);
  });

  it("returns null when this build is already the latest", async () => {
    sdk.getString.mockReturnValue(RUNNING);
    const { checkForUpdate } = await load();
    expect(await checkForUpdate(RUNNING)).toBeNull();
  });

  it("does nothing when the check is off for this build (no version)", async () => {
    const { checkForUpdate } = await load();
    expect(await checkForUpdate("")).toBeNull();
    expect(sdk.fetchAndActivate).not.toHaveBeenCalled();
  });

  it("does nothing when the app is using the Firebase emulators", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", "true");
    const { checkForUpdate } = await load();
    expect(await checkForUpdate(RUNNING)).toBeNull();
    expect(sdk.fetchAndActivate).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("does nothing in browsers without Remote Config support", async () => {
    sdk.isSupported.mockResolvedValue(false);
    const { checkForUpdate } = await load();
    expect(await checkForUpdate(RUNNING)).toBeNull();
    expect(sdk.getRemoteConfig).not.toHaveBeenCalled();
  });

  it("carries on quietly when Remote Config can't be reached", async () => {
    sdk.fetchAndActivate.mockRejectedValue(new Error("remoteconfig/fetch-timeout"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { checkForUpdate } = await load();
    expect(await checkForUpdate(RUNNING)).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});
