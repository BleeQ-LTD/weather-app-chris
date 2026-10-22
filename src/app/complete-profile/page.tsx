"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { createProfile, GENDER_OPTIONS } from "@/lib/profile";

const MAX_NAME_LENGTH = 50;
const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

// Shown to users who signed in with Google for the first time,
// because Google doesn't tell us their gender
export default function CompleteProfilePage() {
  const router = useRouter();
  const authState = useAuth();

  // Only signed-in users belong here
  useEffect(() => {
    if (authState.status === "signed-out" || authState.status === "guest") {
      router.replace("/sign-in");
    }
  }, [authState.status, router]);

  if (authState.status !== "signed-in") {
    return (
      <main className="mx-auto w-full max-w-sm px-5 py-16">
        <p className="text-muted" role="status">Loading…</p>
      </main>
    );
  }

  return <CompleteProfileForm user={authState.user} />;
}

function CompleteProfileForm({ user }: { user: User }) {
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
    try {
      await createProfile(user.uid, { name: name.trim(), email: user.email ?? "", gender });
      router.replace("/");
    } catch (err) {
      console.error("[profile] Could not save profile:", err);
      setError("We couldn't save your profile. Check your connection and try again.");
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