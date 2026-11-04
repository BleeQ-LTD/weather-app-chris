"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type User } from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/components/ProfileProvider";
import ProfileError from "@/components/ProfileError";
import { createProfile, GENDER_OPTIONS, type Profile } from "@/lib/profile";

const MAX_NAME_LENGTH = 50;
const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

// Google sign-in is also sign-up: it creates an account if none exists, but Google
// doesn't tell us the user's gender. So a new Google user finishes their profile here.
// The form only shows when Firestore has CONFIRMED there is no profile.
export default function CompleteProfilePage() {
  const router = useRouter();
  const authState = useAuth();
  const profileState = useProfile();

  useEffect(() => {
    // Only signed-in users belong here
    if (authState.status === "signed-out" || authState.status === "guest") {
      router.replace("/sign-in");
    }
    // Existing users already have a profile, so they never belong here
    else if (profileState.status === "ready") {
      router.replace("/");
    }
  }, [authState.status, profileState.status, router]);

  // A loading problem is not the same as "no profile": show the real reason with a retry
  if (authState.status === "signed-in" && profileState.status === "error") {
    return <ProfileError reason={profileState.reason} onRetry={profileState.reload} />;
  }

  if (authState.status === "signed-in" && profileState.status === "missing") {
    const user = authState.user;
    return (
      <CompleteProfileForm
        user={user}
        onSaved={(profile) => profileState.profileSaved(user.uid, profile)}
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-16">
      <p className="text-muted" role="status">Loading your account…</p>
    </main>
  );
}

function CompleteProfileForm({ user, onSaved }: { user: User; onSaved: (profile: Profile) => void }) {
  const router = useRouter();
  // Start with the name Google gave us, which the user can change
  const [name, setName] = useState(user.displayName ?? "");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return setError("Please enter your name.");
    if (name.trim().length > MAX_NAME_LENGTH) return setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
    if (!gender) return setError("Please choose an option for gender.");

    setError("");
    setIsSaving(true);
    const profile: Profile = { name: name.trim(), email: user.email ?? "", gender };
    try {
      // Firestore is the source of truth for the app...
      await createProfile(user.uid, profile);
      // ...and we keep the Auth account's display name consistent with it
      await updateProfile(user, { displayName: profile.name });
      // We just saved it, so the app uses it straight away instead of downloading it again
      onSaved(profile);
      router.replace("/");
    } catch (err) {
      console.error("[profile] Could not save profile:", err);
      setError(
        typeof navigator !== "undefined" && !navigator.onLine
          ? "You're offline. Check your internet connection, then try again."
          : "We couldn't save your profile. Please try again in a moment."
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Almost done</h1>
      <p className="text-muted">Tell us a little about yourself to finish setting up your account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Gender</span>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
            <option value="">Choose…</option>
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {error && (
          <p role="alert" className="border-l-4 border-alert bg-surface px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-md bg-rain px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Continue"}
        </button>
      </form>
    </main>
  );
}