"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/authErrors";
import { signInWithGoogle } from "@/lib/googleSignIn";
import { useAuth } from "@/components/AuthProvider";
import PasswordInput from "@/components/PasswordInput";

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain aria-invalid:border-alert";

type Field = "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

export default function SignInPage() {
  const router = useRouter();
  const authState = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Wrong email/password stays a form-level message, so it never reveals which one was wrong
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already signed in doesn't need this page
  useEffect(() => {
    if (authState.status === "signed-in" && !isSubmitting) router.replace("/");
  }, [authState.status, isSubmitting, router]);

  function clearError(field: Field) {
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  // After any sign-in we go to the home page. The home page loads the profile and decides:
  // existing profile -> the app; no profile (new Google user) -> "complete your profile";
  // connection problem -> an error with a retry.
  async function handleEmailSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (!email.trim()) errors.email = "Please enter your email.";
    if (!password) errors.password = "Please enter your password.";
    setFieldErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (err) {
      const code = (err as { code?: unknown } | null)?.code;
      if (code === "auth/invalid-email") setFieldErrors({ email: authErrorMessage(err) });
      else setFormError(authErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError("");
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      setFormError(authErrorMessage(err));
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearError("email");
            }}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={inputClass}
          />
          {fieldErrors.email && <span id="email-error" className="mt-1 block text-sm text-alert">{fieldErrors.email}</span>}
        </label>

        <label className="block">
          <span className="flex items-center justify-between text-sm font-medium">
            Password
            <Link href="/reset-password" className="font-normal text-muted underline hover:text-ink">
              Forgot password?
            </Link>
          </span>
          <PasswordInput
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
            autoComplete="current-password"
            invalid={Boolean(fieldErrors.password)}
            describedBy={fieldErrors.password ? "password-error" : undefined}
          />
          {fieldErrors.password && (
            <span id="password-error" className="mt-1 block text-sm text-alert">{fieldErrors.password}</span>
          )}
        </label>

        {formError && (
          <p role="alert" className="border-l-4 border-alert bg-surface px-3 py-2 text-sm">
            {formError}
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
      <p className="mt-3 text-sm">
        <Link href="/" className="text-muted underline hover:text-ink">Continue without an account</Link>
      </p>
    </main>
  );
}