"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

// Shown to first-time visitors who haven't signed in or chosen guest mode yet
export default function WelcomeScreen() {
  const { continueAsGuest } = useAuth();

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Weather</h1>
      <p className="mt-2 text-muted">
        Current conditions and a 3-day forecast for anywhere. Create an account to save your
        favourite places.
      </p>

      <div className="mt-10 space-y-3">
        <Link
          href="/sign-up"
          className="block w-full rounded-md bg-rain px-4 py-2 text-center font-medium text-white hover:opacity-90"
        >
          Create account
        </Link>
        <Link
          href="/sign-in"
          className="block w-full rounded-md border border-line bg-surface px-4 py-2 text-center font-medium hover:border-rain"
        >
          Sign in
        </Link>
        <button
          type="button"
          onClick={continueAsGuest}
          className="block w-full px-4 py-2 text-center text-muted underline hover:text-ink"
        >
          Continue as guest
        </button>
      </div>
    </main>
  );
}