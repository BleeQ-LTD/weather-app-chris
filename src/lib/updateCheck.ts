"use client";

import { fetchAndActivate, getRemoteConfig, getString, isSupported, type RemoteConfig } from "firebase/remote-config";
import { app } from "@/lib/firebase";
import { APP_VERSION, isNewerVersion } from "@/lib/appVersion";

export const LATEST_VERSION_KEY = "latest_version";

// How often Remote Config may actually ask the server. Checks in between (tab focus,
// the 30-minute timer) reuse the last answer, which keeps us well inside Firebase's
// fetch limits. The cost: someone may hear about a new version up to 30 minutes late.
export const MIN_FETCH_INTERVAL_MS = 30 * 60_000;
const FETCH_TIMEOUT_MS = 10_000;

let remoteConfig: RemoteConfig | null = null;

async function getConfig(): Promise<RemoteConfig | null> {
  if (remoteConfig) return remoteConfig;
  // Remote Config needs IndexedDB; some private modes and old browsers don't have it
  if (!(await isSupported())) return null;
  remoteConfig = getRemoteConfig(app);
  remoteConfig.settings.minimumFetchIntervalMillis = MIN_FETCH_INTERVAL_MS;
  remoteConfig.settings.fetchTimeoutMillis = FETCH_TIMEOUT_MS;
  remoteConfig.defaultConfig = { [LATEST_VERSION_KEY]: "" }; // nothing published = no prompt
  return remoteConfig;
}

// Out: the newer version that's live, or null when there isn't one, the check is off
// for this build, or Remote Config can't be reached. Never throws: if anything goes
// wrong the app carries on as normal and the reason goes to the console only.
export async function checkForUpdate(currentVersion = APP_VERSION): Promise<string | null> {
  if (!currentVersion) return null; // local development, preview deploy, or no git info
  // The Firebase emulators use a placeholder API key and have no Remote Config
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true") return null;
  try {
    const config = await getConfig();
    if (!config) return null;
    await fetchAndActivate(config);
    const published = getString(config, LATEST_VERSION_KEY);
    return isNewerVersion(published, currentVersion) ? published : null;
  } catch (error) {
    console.warn("[update] Couldn't check for a new version (the app works as normal):", error);
    return null;
  }
}
