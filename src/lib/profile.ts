import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// The gender choices. These must match the list in firestore.rules.
export const GENDER_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

export type NewProfile = {
  name: string;
  email: string;
  gender: string;
};

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

// True if this user already has a profile (Google users won't, the first time)
export async function profileExists(uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists();
}