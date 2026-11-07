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
import Select from "@/components/Select";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 50;

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 focus:border-rain aria-invalid:border-alert";

type Field = "name" | "email" | "gender" | "password";
type FieldErrors = Partial<Record<Field, string>>;

// Which field a Firebase error belongs to, so the message shows under that field
function fieldForAuthError(error: unknown): Field | null {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "auth/email-already-in-use" || code === "auth/invalid-email") return "email";
  if (code === "auth/weak-password") return "password";
  return null;
}

export default function SignUpPage() {
  const router = useRouter();
  const authState = useAuth();
  const { profileSaved } = useProfile();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState(""); // problems that aren't about one field
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Someone who is already signed in doesn't need this page.
  // While sign-up is in progress we wait, so the profile finishes saving first.
  useEffect(() => {
    if (authState.status === "signed-in" && !isSubmitting) router.replace("/");
  }, [authState.status, isSubmitting, router]);

  // Typing in a field clears that field's error
  function clearError(field: Field) {
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
  }

  // Check every field before contacting Firebase
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Please enter your name.";
    else if (name.trim().length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
    if (!email.trim()) errors.email = "Please enter your email.";
    if (!gender) errors.gender = "Please choose an option.";
    if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    return errors;
  }

  // Email sign-up: Firebase Auth stores the email and password (and we set the display name);
  // Firestore stores the full profile at users/{uid}, which is what the app reads.
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setFormError("");
    if (Object.values(errors).some(Boolean)) return;

    setIsSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      // Keep the Auth display name consistent with the profile
      await updateProfile(user, { displayName: name.trim() });
      const newProfile = { name: name.trim(), email: user.email ?? email.trim(), gender };
      await createProfile(user.uid, newProfile);
      // We just saved it, so the app uses it straight away instead of downloading it again
      profileSaved(user.uid, newProfile);
      router.replace("/");
    } catch (err) {
      const field = fieldForAuthError(err);
      if (field) setFieldErrors({ [field]: authErrorMessage(err) });
      else setFormError(authErrorMessage(err));
      setIsSubmitting(false);
    }
  }

  // Google sign-up is the same flow as Google sign-in: Firebase creates the account if
  // it doesn't exist. Google doesn't give us gender, so the home page sends new
  // Google users to "complete your profile".
  async function handleGoogleSignUp() {
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
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
            maxLength={MAX_NAME_LENGTH}
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={inputClass}
          />
          {fieldErrors.name && <span id="name-error" className="mt-1 block text-sm text-alert">{fieldErrors.name}</span>}
        </label>

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

        <div>
          <Select
            label="Gender"
            value={gender}
            onChange={(value) => {
              setGender(value);
              clearError("gender");
            }}
            options={GENDER_OPTIONS}
            invalid={Boolean(fieldErrors.gender)}
            describedBy={fieldErrors.gender ? "gender-error" : undefined}
          />
          {fieldErrors.gender && <span id="gender-error" className="mt-1 block text-sm text-alert">{fieldErrors.gender}</span>}
        </div>

        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <PasswordInput
            value={password}
            onChange={(value) => {
              setPassword(value);
              clearError("password");
            }}
            autoComplete="new-password"
            invalid={Boolean(fieldErrors.password)}
            describedBy="password-help"
          />
          <span id="password-help" className={`mt-1 block text-sm ${fieldErrors.password ? "text-alert" : "text-muted"}`}>
            {fieldErrors.password ?? `At least ${MIN_PASSWORD_LENGTH} characters.`}
          </span>
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
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline hover:text-ink">Sign in</Link>
      </p>
      <p className="mt-3 text-sm">
        <Link href="/" className="text-muted underline hover:text-ink">Continue without an account</Link>
      </p>
    </main>
  );
}