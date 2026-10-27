// SERVER ONLY. Never import this file from a "use client" component:
// it uses a service account key that must never reach the browser.
//
// The Admin SDK can do things the browser can't, such as generating a password
// reset link. Unlike the client SDK, it skips Firestore security rules, so we only
// use it for this one job.
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// A named app, so it never mixes with any default credentials the hosting platform provides
// (App Hosting runs in the BleeQ Audit project, but our users live in weather-app).
const ADMIN_APP_NAME = "weather-admin";

function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  // Local development: talk to the Auth emulator, which needs no real key
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }, ADMIN_APP_NAME);
  }

  // Not called FIREBASE_... because Firebase App Hosting reserves that prefix
  const serviceAccountJson = process.env.ADMIN_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountJson) {
    throw new Error("ADMIN_SERVICE_ACCOUNT_KEY is not set");
  }
  return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) }, ADMIN_APP_NAME);
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}