"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/authErrors";
import { profileExists } from "@/lib/profile";
import { useAuth } from "@/components/AuthProvider";
import PasswordInput from "@/components/PasswordInput";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

export default function SignInPage() {
  const router = useRouter();
  const authState = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already signed in doesn't need this page.
  // While a sign-in is in progress we wait, so we can check their profile first.
  useEffect(() => {
    if (authState.status === "signed-in" && !isSubmitting) router.replace("/");
  }, [authState.status, isSubmitting, router]);

  // After signing in: users without a profile (first-time Google users) finish setting it up
  async function goToNextPage(uid: string) {
    const hasProfile = await profileExists(uid);
    router.replace(hasProfile ? "/" : "/complete-profile");
  }

  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
      await goToNextPage(user.uid);
    } catch (err) {
      setError(authErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setIsSubmitting(true);
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await goToNextPage(user.uid);
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
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted">Welcome back.</p>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        className="mt-8 w-full rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-rain disabled:opacity-60"
      >
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={handleEmailSignIn} noValidate className="space-y-4">
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
          <span className="flex items-center justify-between text-sm font-medium">
            Password
            <Link href="/reset-password" className="font-normal text-muted underline hover:text-ink">
              Forgot password?
            </Link>
          </span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
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
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New here?{" "}
        <Link href="/sign-up" className="underline hover:text-ink">Create an account</Link>
      </p>
    </main>
  );
}