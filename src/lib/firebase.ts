// Sets up Firebase once for the whole app.
// Only import this from client components ("use client"), because sign-in runs in the browser.
import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);

// When working locally, talk to the Firebase Emulator instead of a real project
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const globalFlags = globalThis as { firebaseEmulatorsConnected?: boolean };

if (useEmulators && typeof window !== "undefined" && !globalFlags.firebaseEmulatorsConnected) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  globalFlags.firebaseEmulatorsConnected = true;
}