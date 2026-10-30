"use client";

import { useState } from "react";
import Link from "next/link";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain";

const REQUEST_TIMEOUT_MS = 20_000; // give up waiting for the server after this long

type ShownError = {
  message: string;
  code?: string; // shown small, so a user can quote it and we can find it in the logs
};

// When the server didn't send its own message (e.g. it crashed), explain the
// failure using the HTTP status instead of one catch-all sentence
function messageForStatus(status: number): string {
  if (status === 429) return "Too many reset requests. Please wait a few minutes and try again.";
  if (status === 500) return "Something went wrong on our side, and it's not your fault. Please try again later.";
  if (status === 502 || status === 503 || status === 504) {
    return "The reset service is temporarily unavailable. Please try again in a moment.";
  }
  return `Something unexpected went wrong (error ${status}). Please try again.`;
}

// Asks our server (/api/reset-password) to email a reset link.
// The server sends the email itself, so the link opens OUR /auth/action page
// instead of Firebase's default page.
export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<ShownError | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      setError({ message: "Please enter your email." });
      return;
    }

    setError(null);
    setIsSending(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (response.ok) {
        // Shown whether or not an account exists, so this page can't be used
        // to find out who has an account
        setIsSent(true);
        return;
      }

      // Our route sends { error: { code, message } }. If it crashed, the body may be
      // HTML or empty, so fall back to a message based on the status code.
      const body = await response.json().catch(() => null);
      const serverError = body?.error;
      if (typeof serverError?.message === "string") {
        setError({ message: serverError.message, code: serverError.code });
      } else {
        setError({ message: messageForStatus(response.status), code: `HTTP_${response.status}` });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setError({ message: "This is taking too long. Check your connection and try again.", code: "TIMEOUT" });
      } else {
        setError({ message: "You seem to be offline. Check your connection and try again.", code: "NETWORK" });
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
          <div role="alert" className="border-l-4 border-alert bg-surface px-3 py-2 text-sm">
            <p>{error.message}</p>
          </div>
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