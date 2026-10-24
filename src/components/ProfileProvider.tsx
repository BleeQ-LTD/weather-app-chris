"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { loadProfile, type Profile } from "@/lib/profile";

// The states the signed-in user's profile can be in
export type ProfileState =
  | { status: "no-user" } // guest or signed out: there is no profile to load
  | { status: "loading" } // still asking Firestore
  | { status: "ready"; profile: Profile } // found it
  | { status: "missing" } // Firestore confirmed there is no profile (a new Google user)
  | { status: "error" }; // couldn't reach Firestore (offline, slow, timed out)

export type ProfileContextValue = ProfileState & {
  reload: () => void; // ask Firestore again (the "Try again" button, or after saving a profile)
};

type Finished = Extract<ProfileState, { status: "ready" | "missing" | "error" }>;

const ProfileContext = createContext<ProfileContextValue>({ status: "no-user", reload: () => {} });

// Loads the signed-in user's profile from Firestore once, and shares it with the whole app.
// This is the app's single source of truth for the user's name, email and gender.
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const authState = useAuth();
  const uid = authState.status === "signed-in" ? authState.user.uid : null;

  // Each reload increases attempt, which starts a fresh load
  const [attempt, setAttempt] = useState(0);
  // The last finished load, labelled with which user and which attempt it was for
  const [result, setResult] = useState<{ key: string; state: Finished } | null>(null);

  useEffect(() => {
    if (!uid) return;
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
        setResult({ key, state: { status: "error" } });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  // Only trust a result that belongs to the current user and the latest attempt
  let state: ProfileState;
  if (!uid) state = { status: "no-user" };
  else if (!result || result.key !== `${uid}:${attempt}`) state = { status: "loading" };
  else state = result.state;

  const value: ProfileContextValue = {
    ...state,
    reload: () => setAttempt((count) => count + 1),
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

// Use this in any component: const profileState = useProfile();
export function useProfile() {
  return useContext(ProfileContext);
}