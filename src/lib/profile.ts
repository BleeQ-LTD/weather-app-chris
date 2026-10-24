import { doc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// The gender choices. These must match the list in firestore.rules.
export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

// A user's details as the app reads them.
// The Firestore document at users/{uid} is the single source of truth for these:
// the app never reads the name from the Firebase Auth account.
export type Profile = {
  name: string;
  email: string;
  gender: string;
};

export type NewProfile = Profile;

// How long to wait for Firestore before treating the connection as failed
const PROFILE_TIMEOUT_MS = 10_000;

// Saves a new user's profile at users/{uid}.
// The fields must match what firestore.rules allows, or the save is rejected.
// createdAt uses the server's clock, which the rules check.
export async function createProfile(uid: string, profile: NewProfile) {
  await setDoc(doc(db, "users", uid), {
    name: profile.name,
    email: profile.email,
    gender: profile.gender,
    createdAt: serverTimestamp(),
  });
}

// Loads the profile straight from the server, never from a cached copy.
// - Returns the profile if it exists
// - Returns null only when Firestore itself confirms there is no profile (a new Google user)
// - Throws if Firestore can't be reached in time (offline or slow connection),
//   so a connection problem is never mistaken for "this user has no profile"
export async function loadProfile(uid: string): Promise<Profile | null> {
  const snapshot = await withTimeout(getDocFromServer(doc(db, "users", uid)), PROFILE_TIMEOUT_MS);
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    name: String(data.name ?? ""),
    email: String(data.email ?? ""),
    gender: String(data.gender ?? ""),
  };
}

// Rejects if the promise takes longer than ms milliseconds
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}