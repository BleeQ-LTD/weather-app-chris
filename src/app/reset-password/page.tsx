"use client";

import { useState } from "react";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

// Asks our server (/api/reset-password) to email a reset link.
// The server sends the email itself, so the link opens OUR /auth/action page
// instead of Firebase's default page.
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
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (response.ok) {
        // Shown whether or not an account exists, so this page can't be used
        // to find out who has an account
        setIsSent(true);
        return;
      }

      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "We couldn't send the email right now. Please try again.");
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
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