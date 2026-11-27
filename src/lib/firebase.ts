// Sets up Firebase once for the whole app.
// Only import this from client components ("use client"), because sign-in runs in the browser.
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

// These values identify the Firebase project. They are NOT secret:
// every Firebase web app sends them to the browser. Data is protected by security rules instead.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app if one was already created (stops errors during hot reload)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore normally keeps one long streaming connection open. Some antivirus
// HTTPS scanners, proxies and networks hold that stream back, so the data never
// arrives and favourites time out with no error. Long polling sends each update as
// a short, complete response instead, which those filters pass straight through.
export const FIRESTORE_SETTINGS = { experimentalForceLongPolling: true };

function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, FIRESTORE_SETTINGS);
  } catch {
    // Already set up (hot reload re-runs this file): reuse that instance
    return getFirestore(app);
  }
}

export const db = createFirestore();

// When working locally, talk to the Firebase Emulator instead of a real project
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const globalFlags = globalThis as { firebaseEmulatorsConnected?: boolean };

if (useEmulators && typeof window !== "undefined" && !globalFlags.firebaseEmulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalFlags.firebaseEmulatorsConnected = true;
}