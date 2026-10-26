"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, signInWithEmailAndPassword, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authErrorMessage } from "@/lib/authErrors";
import PasswordInput from "@/components/PasswordInput";

const MIN_PASSWORD_LENGTH = 8;

// Firebase's emails link here (set as the "action URL" in the Firebase console):
//   /auth/action?mode=resetPassword&oobCode=<one-time code>
// Handling the reset on our own page, instead of Firebase's default page, means the browser
// sees a username + new password on OUR site and can offer to update the saved password.
export default function AuthActionPage() {
  // useSearchParams must be inside a Suspense boundary in the Next.js App Router
  return (
    <Suspense fallback={<Message title="Checking your link…" />}>
      <AuthAction />
    </Suspense>
  );
}

function AuthAction() {
  const params = useSearchParams();
  const mode = params.get("mode");
  const code = params.get("oobCode");

  if (mode !== "resetPassword" || !code) {
    return (
      <Message title="This link isn't valid">
        It may be incomplete. Request a new link from the{" "}
        <Link href="/reset-password" className="underline hover:text-ink">reset password page</Link>.
      </Message>
    );
  }

  return <ResetPassword code={code} />;
}

type CodeCheck =
  | { status: "checking" }
  | { status: "valid"; email: string }
  | { status: "invalid"; message: string };

function ResetPassword({ code }: { code: string }) {
  const [check, setCheck] = useState<CodeCheck>({ status: "checking" });

  // Step 1: ask Firebase whether the code is still valid. If it is, Firebase tells us whose
  // account it's for. Codes expire after a while and can only be used once.
  useEffect(() => {
    let cancelled = false;
    verifyPasswordResetCode(auth, code).then(
      (email) => {
        if (!cancelled) setCheck({ status: "valid", email });
      },
      (err) => {
        if (!cancelled) setCheck({ status: "invalid", message: authErrorMessage(err) });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (check.status === "checking") return <Message title="Checking your link…" />;

  if (check.status === "invalid") {
    return (
      <Message title="This reset link can't be used">
        {check.message}{" "}
        <Link href="/reset-password" className="underline hover:text-ink">Request a new link</Link>.
      </Message>
    );
  }

  return <NewPasswordForm code={code} email={check.email} />;
}

function NewPasswordForm({ code, email }: { code: string; email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      // Step 2: save the new password using the one-time code
      await confirmPasswordReset(auth, code, password);
      // Step 3: sign them straight in with it, then go to the app
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (err) {
      setError(authErrorMessage(err));
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="text-muted">You&apos;ll be signed in once it&apos;s saved.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        {/* The account's email as the "username". Password managers use it to know
            which saved login to update with the new password. */}
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            className="mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-muted"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">New password</span>
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
          disabled={isSaving}
          className="w-full rounded-md bg-rain px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save new password"}
        </button>
      </form>
    </main>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-sm px-5 py-10 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <p className="mt-2 text-muted">{children}</p>}
    </main>
  );
}