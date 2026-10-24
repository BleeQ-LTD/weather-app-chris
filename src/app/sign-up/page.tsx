"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/authErrors";
import { signInWithGoogle } from "@/lib/googleSignIn";
import { createProfile, GENDER_OPTIONS } from "@/lib/profile";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/components/ProfileProvider";
import PasswordInput from "@/components/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 50;

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

export default function SignUpPage() {
  const router = useRouter();
  const authState = useAuth();
  const { reload: reloadProfile } = useProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already signed in doesn't need this page.
  // While sign-up is in progress we wait, so the profile finishes saving first.
  useEffect(() => {
    if (authState.status === "signed-in" && !isSubmitting) router.replace("/");
  }, [authState.status, isSubmitting, router]);

  // Check the form before contacting Firebase. Returns an error message, or "" if all is fine.
  function validate(): string {
    if (!name.trim()) return "Please enter your name.";
    if (name.trim().length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    if (!email.trim()) return "Please enter your email.";
    if (!gender) return "Please choose an option for gender.";
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return "";
  }

  // Email sign-up: Firebase Auth stores the email and password (and we set the display name);
  // Firestore stores the full profile at users/{uid}, which is what the app reads.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Keep the Auth display name consistent with the profile
      await updateProfile(user, { displayName: name.trim() });
      // Save the profile (the app's source of truth) to Firestore at users/{uid}
      await createProfile(user.uid, {
        name: name.trim(),
        email: user.email ?? email.trim(),
        gender,
      });
      reloadProfile(); // the profile now exists, so load it fresh
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  // Google sign-up is the same flow as Google sign-in: Firebase creates the account if
  // it doesn't exist. Google doesn't give us gender, so the home page sends new
  // Google users to "complete your profile".
  async function handleGoogleSignUp() {
    setError("");
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  // While Firebase checks whether someone is already signed in, show a loading state
  if (authState.status === "checking" || (authState.status === "signed-in" && !isSubmitting)) {
    return (
      <main className="mx-auto w-full max-w-sm px-5 py-16">
        <p className="text-muted" role="status">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
      <p className="text-muted">Save your favourite places and see them on any device.</p>

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={isSubmitting}
        className="mt-8 w-full rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-rain disabled:opacity-60"
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        or sign up with email
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          <span className="mt-1 block text-xs text-muted">At least {MIN_PASSWORD_LENGTH} characters.</span>
        </label>

        {error && (
          <p role="alert" className="border-l-4 border-alert bg-surface px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-rain px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline hover:text-ink">Sign in</Link>
      </p>
    </main>
  );
}