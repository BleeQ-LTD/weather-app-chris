"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// The four states a visitor can be in.
// "checking" is the first moment after a page load, while we work out who they are.
// We never treat that as "signed out", so returning users don't see a flash.
export type AuthState =
  | { status: "checking" }
  | { status: "signed-in"; user: User }
  | { status: "guest" }
  | { status: "signed-out" };

type GuestActions = {
  continueAsGuest: () => void;
  leaveGuestMode: () => void;
};

export type AuthContextValue = AuthState & GuestActions;

// ---------- Guest mode, remembered in the browser ----------

const GUEST_STORAGE_KEY = "weather-app:guest-mode";
const GUEST_CHANGE_EVENT = "weather-app:guest-mode-change";
let inMemoryGuest = false; // fallback if the browser blocks storage

function readGuestFlag(): boolean {
  try {
    return window.localStorage.getItem(GUEST_STORAGE_KEY) === "true";
  } catch {
    return inMemoryGuest;
  }
}

function writeGuestFlag(isGuest: boolean) {
  inMemoryGuest = isGuest;
  try {
    if (isGuest) window.localStorage.setItem(GUEST_STORAGE_KEY, "true");
    else window.localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // Storage blocked (e.g. strict privacy mode): guest mode still works until reload
  }
  window.dispatchEvent(new Event(GUEST_CHANGE_EVENT));
}

function subscribeToGuestFlag(onChange: () => void) {
  window.addEventListener("storage", onChange); // changes from other tabs
  window.addEventListener(GUEST_CHANGE_EVENT, onChange); // changes from this tab
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUEST_CHANGE_EVENT, onChange);
  };
}

// ---------- Provider ----------

const AuthContext = createContext<AuthContextValue>({
  status: "checking",
  continueAsGuest: () => {},
  leaveGuestMode: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // undefined = Firebase hasn't told us yet; null = nobody signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  // null on the server (it can't see the browser's storage), true/false in the browser
  const isGuest = useSyncExternalStore<boolean | null>(subscribeToGuestFlag, readGuestFlag, () => null);

  // Firebase calls setUser once it knows who is signed in, and again on every change
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Signing in leaves guest mode, so signing out later shows the welcome screen
  useEffect(() => {
    if (user) writeGuestFlag(false);
  }, [user]);

  let state: AuthState;
  if (user === undefined || isGuest === null) state = { status: "checking" };
  else if (user) state = { status: "signed-in", user };
  else if (isGuest) state = { status: "guest" };
  else state = { status: "signed-out" };

  const value: AuthContextValue = {
    ...state,
    continueAsGuest: () => writeGuestFlag(true),
    leaveGuestMode: () => writeGuestFlag(false),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Use this in any component: const authState = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}