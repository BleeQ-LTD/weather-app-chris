"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/components/ProfileProvider";
import ProfileError from "@/components/ProfileError";
import ProfileForm from "@/components/ProfileForm";

// /profile: the signed-in user's photo, name, email and gender, with name and gender editable.
// Guests and signed-out visitors are asked to sign in instead.
export default function ProfilePage() {
  const router = useRouter();
  const authState = useAuth();
  const profileState = useProfile();

  // A new Google user without a profile finishes it first
  useEffect(() => {
    if (authState.status === "signed-in" && profileState.status === "missing") {
      router.replace("/complete-profile");
    }
  }, [authState.status, profileState.status, router]);

  if (authState.status === "signed-in" && profileState.status === "error") {
    return <ProfileError reason={profileState.reason} onRetry={profileState.reload} />;
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-2 pb-10 sm:px-5 sm:pt-4">
      <h1 className="px-1 text-3xl font-bold tracking-tight">Your profile</h1>

      <div className="mt-5">
        {authState.status === "guest" || authState.status === "signed-out" ? (
          // Guests: explain what an account gives them, with the way in
          <div className="rounded-[28px] bg-surface px-6 py-7">
            <p className="leading-relaxed text-muted">
              Sign in to see your profile, change your name and keep your favourites on any device.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/sign-in"
                className="flex min-h-12 items-center rounded-[14px] bg-rain px-5 font-semibold text-white hover:brightness-110"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="flex min-h-12 items-center rounded-[14px] border border-line px-5 font-medium hover:bg-accent-soft"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : authState.status === "signed-in" && profileState.status === "ready" ? (
          <ProfileForm
            user={authState.user}
            profile={profileState.profile}
            onSaved={(profile) => profileState.profileSaved(authState.user.uid, profile)}
          />
        ) : (
          <div role="status" className="flex items-center gap-3 rounded-[28px] bg-surface p-5">
            <span className="sr-only">Loading your profile…</span>
            <span aria-hidden="true" className="h-[72px] w-[72px] rounded-full bg-line motion-safe:animate-pulse" />
            <span aria-hidden="true" className="flex flex-1 flex-col gap-2">
              <span className="h-5 w-40 rounded bg-line motion-safe:animate-pulse" />
              <span className="h-4 w-56 rounded bg-line motion-safe:animate-pulse" />
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
