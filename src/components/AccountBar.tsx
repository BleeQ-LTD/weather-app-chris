"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/components/ProfileProvider";

// Top-right of the nav: sign-in links, "Guest", or the signed-in user's name with Sign out.
// The friendly greeting now lives with the weather (Greeting), so this stays small.
export default function AccountBar() {
  const authState = useAuth();
  const profileState = useProfile();

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[auth] Sign-out failed:", err);
    }
  }

  // While Firebase checks who is signed in, show a placeholder instead of guessing
  if (authState.status === "checking") {
    return <div className="h-8 w-24 shrink-0 rounded-md bg-line motion-safe:animate-pulse" aria-hidden="true" />;
  }

  if (authState.status === "guest" || authState.status === "signed-out") {
    return (
      <nav className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
        {authState.status === "guest" && (
          <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">Guest</span>
        )}
        <Link href="/sign-in" className="hover:underline">Sign in</Link>
        <Link href="/sign-up" className="rounded-md bg-rain px-3 py-1.5 font-medium text-white hover:opacity-90">
          Create account
        </Link>
      </nav>
    );
  }

  // The name comes from the Firestore profile: the app's single source of truth
  const fullName =
    profileState.status === "ready" && profileState.profile.name
      ? profileState.profile.name
      : authState.user.email || "";
  const firstName = fullName.split(" ")[0];

  return (
    <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm">
      {firstName && <span className="hidden text-muted sm:inline">{firstName}</span>}
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-line bg-surface px-3 py-1.5 hover:border-rain"
      >
        Sign out
      </button>
    </div>
  );
}