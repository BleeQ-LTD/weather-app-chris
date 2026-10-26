"use client";

import { useState } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/authErrors";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setError("");
    setIsSending(true);
    try {
      // Tell Firebase where the link in the email should open: our own page.
      // handleCodeInApp means our app handles the reset code, instead of
      // Firebase's default page. Firebase adds mode=resetPassword and the
      // one-time oobCode to this URL. The domain must be an authorised domain.
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email.trim(), actionCodeSettings);
      setIsSent(true);
    } catch (err) {
      // Show the same success message whether or not an account exists,
      // so attackers can't use this page to find out who has an account
      if (err instanceof FirebaseError && err.code === "auth/user-not-found") {
        setIsSent(true);
      } else {
        setError(authErrorMessage(err));
      }
    } finally {
      setIsSending(false);
    }
  }

  if (isSent) {
    return (
      <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-muted">
          If an account exists for <span className="font-medium text-ink">{email.trim()}</span>, we&apos;ve
          sent a link to reset your password. It can take a few minutes, so check your spam folder too.
        </p>
        <Link href="/sign-in" className="mt-8 inline-block underline hover:text-ink">
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="text-muted">Enter your email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
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

        {error && (
          <p role="alert" className="border-l-4 border-alert bg-surface px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="w-full rounded-md bg-rain px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSending ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/sign-in" className="underline hover:text-ink">Back to sign in</Link>
      </p>
    </main>
  );
}