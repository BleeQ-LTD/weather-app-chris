"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Shown when sign-in worked but the profile couldn't be loaded (offline or slow connection).
// We never send an existing user to "complete your profile" just because the connection failed.
export default function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-16">
      <div role="alert" className="border-l-4 border-alert pl-4">
        <h1 className="font-semibold">Couldn&apos;t load your account</h1>
        <p className="mt-1">
          You&apos;re signed in, but we couldn&apos;t reach the server to load your profile. Check your
          internet connection and try again.
        </p>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-rain px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => signOut(auth).catch((err) => console.error("[auth] Sign-out failed:", err))}
          className="rounded-md border border-line bg-surface px-4 py-2 hover:border-rain"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}