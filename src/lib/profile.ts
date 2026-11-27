import { deleteField, doc, getDocFromServer, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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
  photo?: string; // the user's own photo, a small JPEG as text; none = Google photo or initial
};

export type NewProfile = Omit<Profile, "photo">;

// Must match the name length allowed in firestore.rules
export const MAX_NAME_LENGTH = 50;

// The two fields people can edit (on /complete-profile and /profile)
export type ProfileField = "name" | "gender";
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

// In:  what the user typed for name and picked for gender.
// Out: a message per field that's wrong (empty object when both are fine),
//      checked the same way firestore.rules will check them.
export function validateProfileFields(name: string, gender: string): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const trimmed = name.trim();
  if (!trimmed) errors.name = "Please enter your name.";
  else if (trimmed.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  if (!GENDER_OPTIONS.some((option) => option.value === gender)) errors.gender = "Please choose an option.";
  return errors;
}

// Changes the name and gender at users/{uid}. Email and createdAt are left as they
// are; the rules check the whole profile is still valid and createdAt didn't change.
export async function updateProfileDetails(uid: string, details: Pick<Profile, "name" | "gender">) {
  await updateDoc(doc(db, "users", uid), { name: details.name, gender: details.gender });
}

// Saves the user's own photo (from makeAvatar) at users/{uid}, or removes it when null.
// The rules only accept a small JPEG; removing it brings back the Google photo or initial.
export async function updateProfilePhoto(uid: string, photo: string | null) {
  await updateDoc(doc(db, "users", uid), { photo: photo ?? deleteField() });
}

// In:  the error from saving, and whether the browser is online.
// Out: the real reason in one sentence: offline, slow, signed out, or our side.
export function profileSaveError(error: unknown, isOnline: boolean): string {
  if (!isOnline) return "You're offline. Reconnect and try again.";
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code).replace(/^(firestore|auth)\//, "")
      : "";
  if (code === "unavailable" || code === "deadline-exceeded" || code === "network-request-failed") {
    return "The connection is too slow right now. Try again in a moment.";
  }
  if (code === "unauthenticated" || code === "user-token-expired") {
    return "You've been signed out. Sign in again, then try again.";
  }
  return "Something went wrong on our side. Try again in a moment.";
}

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
    // Only a real image; anything else is ignored rather than shown
    ...(typeof data.photo === "string" && data.photo.startsWith("data:image/jpeg;base64,")
      ? { photo: data.photo }
      : {}),
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