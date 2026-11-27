"use client";

import { useEffect, useState } from "react";
import { updateProfile, type User } from "firebase/auth";
import Avatar from "@/components/Avatar";
import Select from "@/components/Select";
import { AlertIcon, CheckIcon } from "@/components/icons";
import {
  GENDER_OPTIONS,
  MAX_NAME_LENGTH,
  profileSaveError,
  updateProfileDetails,
  updateProfilePhoto,
  validateProfileFields,
  type Profile,
  type ProfileFieldErrors,
} from "@/lib/profile";
import { ACCEPTED_TYPES, checkAvatarFile, makeAvatar } from "@/lib/avatarImage";

const SAVED_MESSAGE_MS = 4000; // how long "Profile saved" stays visible

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

// The signed-in user's profile: photo, name, email and gender, with name and gender editable.
// In:  the Firebase Auth user (for the photo and display name), their Firestore profile,
//      and onSaved, called with the new profile once it's stored.
// Saving writes Firestore first (the source of truth), then the Auth display name.
export default function ProfileForm({
  user,
  profile,
  onSaved,
}: {
  user: User;
  profile: Profile;
  onSaved: (profile: Profile) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [gender, setGender] = useState(profile.gender);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});
  const [error, setError] = useState(""); // saving problems, not about one field
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = name.trim() !== profile.name || gender !== profile.gender;
  const signedInWithGoogle = user.providerData.some((provider) => provider.providerId === "google.com");

  // Hide "Profile saved" after a few seconds
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateProfileFields(name, gender);
    setFieldErrors(errors);
    setError("");
    setSaved(false);
    if (Object.values(errors).some(Boolean)) return;

    // Firestore would wait silently while offline, so say so straight away
    if (!isOnline()) {
      setError(`Couldn't save your profile. ${profileSaveError(null, false)}`);
      return;
    }

    const next: Profile = { ...profile, name: name.trim(), gender };
    setIsSaving(true);
    try {
      await updateProfileDetails(user.uid, { name: next.name, gender: next.gender });
    } catch (err) {
      console.error("[profile] Could not save profile:", err);
      setError(`Couldn't save your profile. ${profileSaveError(err, isOnline())}`);
      setIsSaving(false);
      return;
    }

    // Firestore has it, so it's saved. Keeping the Auth display name in step is a
    // nice-to-have: if it fails, the app still shows the right name from Firestore.
    try {
      if (user.displayName !== next.name) await updateProfile(user, { displayName: next.name });
    } catch (err) {
      console.error("[profile] Saved to Firestore, but could not update the Auth display name:", err);
    }

    setName(next.name);
    onSaved(next); // the nav and greeting use the new name straight away
    setSaved(true);
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Who you are, with the photo controls */}
      <section aria-label="Your account" className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar photoURL={profile.photo || user.photoURL} name={profile.name} size={72} />
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{profile.name}</p>
            <p className="truncate text-muted">{profile.email}</p>
            <p className="mt-1 text-[13px] text-muted">
              {profile.photo
                ? "This is the photo you added."
                : user.photoURL
                  ? "Your photo comes from your Google account. You can use a different one."
                  : signedInWithGoogle
                    ? "Your Google account has no photo. Add one, or we'll show your initial."
                    : "Add a photo, or we'll show your initial."}
            </p>
          </div>
        </div>
        <ProfilePhoto uid={user.uid} profile={profile} onSaved={onSaved} />
      </section>

      {/* Edit details */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 rounded-[28px] bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your details</h2>

        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldErrors((errors) => ({ ...errors, name: undefined }));
              setSaved(false);
            }}
            maxLength={MAX_NAME_LENGTH}
            aria-invalid={Boolean(fieldErrors.name) || undefined}
            aria-describedby={fieldErrors.name ? "profile-name-error" : undefined}
            className="mt-1 h-12 w-full rounded-[14px] border border-control bg-surface px-3.5 aria-invalid:border-alert"
          />
          {fieldErrors.name && (
            <span id="profile-name-error" className="mt-1 block text-sm font-medium text-alert">
              {fieldErrors.name}
            </span>
          )}
        </label>

        <div>
          <Select
            label="Gender"
            value={gender}
            onChange={(value) => {
              setGender(value);
              setFieldErrors((errors) => ({ ...errors, gender: undefined }));
              setSaved(false);
            }}
            options={GENDER_OPTIONS}
            invalid={Boolean(fieldErrors.gender)}
            describedBy={fieldErrors.gender ? "profile-gender-error" : undefined}
          />
          {fieldErrors.gender && (
            <span id="profile-gender-error" className="mt-1 block text-sm font-medium text-alert">
              {fieldErrors.gender}
            </span>
          )}
        </div>

        <div>
          <span className="text-sm font-medium">Email</span>
          <p className="mt-1 text-muted">{profile.email}</p>
          <p className="text-[13px] text-muted">Your email is your sign-in, so it can&apos;t be changed here.</p>
        </div>

        {/* The button, with its result right underneath */}
        <div className="flex flex-col items-start gap-2 pt-1">
          <button
            type="submit"
            disabled={isSaving || !hasChanges}
            className="h-12 rounded-[14px] bg-rain px-6 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm font-medium text-ok">
            {saved && (
              <>
                <CheckIcon size={16} />
                Profile saved
              </>
            )}
          </p>
          {error && (
            <p role="alert" className="-mt-1 flex items-start gap-1.5 text-sm font-medium text-alert">
              <AlertIcon size={16} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

// Add, change or remove the user's own photo. The photo is shrunk in the browser
// (makeAvatar) and saved on their profile; the result shows right under the buttons.
function ProfilePhoto({
  uid,
  profile,
  onSaved,
}: {
  uid: string;
  profile: Profile;
  onSaved: (profile: Profile) => void;
}) {
  const [busy, setBusy] = useState<"" | "saving" | "removing">("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ""; // so choosing the same file again still works
    if (!file) return;
    setMessage(null);

    const problem = checkAvatarFile(file);
    if (problem) {
      setMessage({ kind: "error", text: problem });
      return;
    }
    if (!isOnline()) {
      setMessage({ kind: "error", text: `Couldn't save your photo. ${profileSaveError(null, false)}` });
      return;
    }

    setBusy("saving");
    let photo: string;
    try {
      photo = await makeAvatar(file);
    } catch (err) {
      console.error("[profile] Could not read the chosen image:", err);
      setMessage({ kind: "error", text: "We couldn't read that image. Try a different one." });
      setBusy("");
      return;
    }
    try {
      await updateProfilePhoto(uid, photo);
      onSaved({ ...profile, photo }); // the nav shows the new photo straight away
      setMessage({ kind: "ok", text: "Photo updated" });
    } catch (err) {
      console.error("[profile] Could not save the photo:", err);
      setMessage({ kind: "error", text: `Couldn't save your photo. ${profileSaveError(err, isOnline())}` });
    }
    setBusy("");
  }

  async function remove() {
    setMessage(null);
    if (!isOnline()) {
      setMessage({ kind: "error", text: `Couldn't remove your photo. ${profileSaveError(null, false)}` });
      return;
    }
    setBusy("removing");
    try {
      await updateProfilePhoto(uid, null);
      const rest = { ...profile };
      delete rest.photo;
      onSaved(rest);
      setMessage({ kind: "ok", text: "Photo removed" });
    } catch (err) {
      console.error("[profile] Could not remove the photo:", err);
      setMessage({ kind: "error", text: `Couldn't remove your photo. ${profileSaveError(err, isOnline())}` });
    }
    setBusy("");
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        {/* A real file input inside the label, so it works with the keyboard and screen readers */}
        <label
          className={`flex h-11 cursor-pointer items-center rounded-xl border-[1.5px] border-link px-4 text-sm font-semibold text-link focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-focus hover:bg-accent-soft ${
            busy ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {busy === "saving" ? "Saving photo…" : profile.photo ? "Change photo" : "Add a photo"}
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={choose}
            disabled={Boolean(busy)}
            className="sr-only"
          />
        </label>
        {profile.photo && (
          <button
            type="button"
            onClick={remove}
            disabled={Boolean(busy)}
            className="h-11 rounded-xl border border-line px-4 text-sm font-medium text-muted hover:border-alert/40 hover:bg-alert-soft hover:text-alert disabled:opacity-60"
          >
            {busy === "removing" ? "Removing…" : "Remove photo"}
          </button>
        )}
      </div>
      <p className="text-[13px] text-muted">JPG, PNG, WebP or GIF, up to 10 MB. We crop it to a square.</p>
      {message?.kind === "ok" && (
        <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-ok">
          <CheckIcon size={16} />
          {message.text}
        </p>
      )}
      {message?.kind === "error" && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-alert">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          {message.text}
        </p>
      )}
    </div>
  );
}
