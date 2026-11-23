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
    return <div className="h-9 w-28 shrink-0 rounded-xl bg-line motion-safe:animate-pulse" aria-hidden="true" />;
  }

  if (authState.status === "guest" || authState.status === "signed-out") {
    return (
      <nav aria-label="Account" className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[15px] sm:gap-2 sm:text-base">
        {authState.status === "guest" && (
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-xs text-muted sm:inline">Guest</span>
        )}
        <Link href="/sign-in" className="flex min-h-11 items-center rounded-xl px-2.5 font-medium hover:bg-accent-soft">
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="flex min-h-11 items-center rounded-xl bg-rain px-3.5 font-semibold text-white hover:brightness-110"
        >
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
    <div className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[15px] sm:gap-2 sm:text-base">
      {firstName && (
        <span className="flex items-center gap-2 border-l border-line pl-2 font-semibold sm:pl-3">
          <span
            aria-hidden="true"
            className="hidden h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-link sm:flex"
          >
            {firstName.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[7rem] truncate">{firstName}</span>
        </span>
      )}
      <button
        type="button"
        onClick={handleSignOut}
        className="min-h-11 rounded-xl px-2 font-medium text-link hover:bg-accent-soft sm:px-3"
      >
        Sign out
      </button>
    </div>
  );
}