"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/components/AuthProvider";
import { loadProfile, type Profile } from "@/lib/profile";

// Why loading the profile failed, so we can tell the user the truth
// instead of always blaming their internet
export type ProfileErrorReason =
  | "offline" // the browser has no connection
  | "slow" // we gave up after our time limit (slow connection)
  | "server"; // anything else: a problem on our side

// The states the signed-in user's profile can be in
export type ProfileState =
  | { status: "no-user" } // guest or signed out: there is no profile to load
  | { status: "loading" } // still asking Firestore
  | { status: "ready"; profile: Profile } // we have it
  | { status: "missing" } // Firestore confirmed there is no profile (a new Google user)
  | { status: "error"; reason: ProfileErrorReason }; // couldn't load it

export type ProfileContextValue = ProfileState & {
  reload: () => void; // ask Firestore again (the "Try again" button)
  // Call right after saving a profile: we already know what's in it, so the app
  // uses it straight away instead of downloading it again (no wait for new users)
  profileSaved: (uid: string, profile: Profile) => void;
};

type Finished = Extract<ProfileState, { status: "ready" | "missing" | "error" }>;

const ProfileContext = createContext<ProfileContextValue>({
  status: "no-user",
  reload: () => {},
  profileSaved: () => {},
});

function reasonFor(error: unknown): ProfileErrorReason {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "offline";
  if (error instanceof Error && error.message.startsWith("Timed out")) return "slow";
  // Firestore says "unavailable" when it can't reach its servers
  if (error instanceof FirebaseError && error.code === "unavailable") return "offline";
  return "server";
}

// Loads the signed-in user's profile from Firestore once, and shares it with the whole app.
// This is the app's single source of truth for the user's name, email and gender.
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuth();
  const uid = authState.status === "signed-in" ? authState.user.uid : null;

  // Each reload increases attempt, which starts a fresh load
  const [attempt, setAttempt] = useState(0);
  // The last finished load, labelled with which user and which attempt it was for
  const [result, setResult] = useState<{ key: string; state: Finished } | null>(null);
  // A profile we saved ourselves in this session (sign-up or complete profile)
  const [saved, setSaved] = useState<{ uid: string; profile: Profile } | null>(null);

  const hasSavedProfile = uid !== null && saved !== null && saved.uid === uid;

  useEffect(() => {
    // Nothing to load for guests, or when we already have the profile we just saved
    if (!uid || hasSavedProfile) return;
    const key = `${uid}:${attempt}`;
    let cancelled = false; // ignore the answer if the user or attempt changed meanwhile

    loadProfile(uid).then(
      (profile) => {
        if (cancelled) return;
        setResult({ key, state: profile ? { status: "ready", profile } : { status: "missing" } });
      },
      (error) => {
        console.error("[profile] Could not load profile:", error);
        if (cancelled) return;
        setResult({ key, state: { status: "error", reason: reasonFor(error) } });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uid, attempt, hasSavedProfile]);

  let state: ProfileState;
  if (!uid) state = { status: "no-user" };
  else if (hasSavedProfile && saved) state = { status: "ready", profile: saved.profile };
  else if (!result || result.key !== `${uid}:${attempt}`) state = { status: "loading" };
  else state = result.state;

  const value: ProfileContextValue = {
    ...state,
    reload: () => setAttempt((count) => count + 1),
    profileSaved: (forUid, profile) => setSaved({ uid: forUid, profile }),
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// Use this in any component: const profileState = useProfile();
export function useProfile() {
  return useContext(ProfileContext);
}