"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

// The three states auth can be in.
// "checking" is the first moment after a page load, while Firebase works out
// whether someone is already signed in. We never treat that as "signed out".
export type AuthState =
  | { status: "checking" }
  | { status: "signed-in"; user: User }
  | { status: "signed-out" };

const AuthContext = createContext<AuthState>({ status: "checking" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "checking" });

  useEffect(() => {
    // Firebase calls this once it knows who is signed in, and again on every sign-in or sign-out
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState(user ? { status: "signed-in", user } : { status: "signed-out" });
    });
    return unsubscribe; // stop listening if the component is removed
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

// Use this in any component: const auth = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}