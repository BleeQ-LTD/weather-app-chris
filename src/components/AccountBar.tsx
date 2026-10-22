"use client";

import Link from "next/link";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";

// Top-right of the page: shows sign-in links, or the signed-in user with a sign-out button
export default function AccountBar() {
  const authState = useAuth();

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[auth] Sign-out failed:", err);
    }
  }

  // While Firebase checks who is signed in, show a placeholder instead of guessing
  if (authState.status === "checking") {
    return (
      <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
        <div className="h-8 w-8 rounded-full bg-line motion-safe:animate-pulse" />
        <div className="h-8 w-20 rounded-md bg-line motion-safe:animate-pulse" />
      </div>
    );
  }

  if (authState.status === "signed-out") {
    return (
      <nav className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
        <Link href="/sign-in" className="hover:underline">Sign in</Link>
        <Link
          href="/sign-up"
          className="rounded-md bg-rain px-3 py-1.5 font-medium text-white hover:opacity-90"
        >
          Create account
        </Link>
      </nav>
    );
  }

  // Show the first name only, so long names don't crowd the header
  const fullName = authState.user.displayName || authState.user.email || "there";
  const firstName = fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rain font-semibold text-white"
        aria-hidden="true"
      >
        {initial}
      </span>
      <span className="hidden sm:inline">Hi, {firstName}</span>
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