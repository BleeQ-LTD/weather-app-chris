"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { ProfileErrorReason } from "@/components/ProfileProvider";

// What we tell the user for each reason. Only "offline" and "slow" mention their
// connection; a problem on our side says so, so they don't waste time on their Wi-Fi.
const MESSAGES: Record<ProfileErrorReason, { title: string; body: string }> = {
  offline: {
    title: "You're offline",
    body: "Check your internet connection, then try again.",
  },
  slow: {
    title: "This is taking longer than usual",
    body: "Your connection may be slow. Please try again in a moment.",
  },
  server: {
    title: "Something went wrong on our side",
    body: "It's not your connection. Please try again in a moment.",
  },
};

// Shown when sign-in worked but the profile couldn't be loaded.
// We never send an existing user to "complete your profile" just because loading failed.
export default function ProfileError({
  reason,
  onRetry,
}: {
  reason: ProfileErrorReason;
  onRetry: () => void;
}) {
  const { title, body } = MESSAGES[reason];

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-16">
      <div role="alert" className="border-l-4 border-alert pl-4">
        <h1 className="font-semibold">{title}</h1>
        <p className="mt-1">{body}</p>
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