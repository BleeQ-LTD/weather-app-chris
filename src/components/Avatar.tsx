"use client";

import { useState } from "react";

// In:  the photo URL from Firebase Auth (Google accounts have one; email sign-ups don't),
//      the person's name for the initial, and a size in pixels.
// Out: their photo in a circle, or their initial when there's no photo or it fails to load.
// Decorative: the name is always shown or announced next to it, so it has no alt text.
export default function Avatar({
  photoURL,
  name,
  size = 32,
  className = "",
}: {
  photoURL: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  // Remember which URL failed, so a new photo after signing in again gets a fresh try
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const showPhoto = Boolean(photoURL) && failedUrl !== photoURL;

  return (
    <span
      aria-hidden="true"
      data-testid="avatar"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft font-bold text-link ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google-hosted photo; next/image would need remotePatterns for googleusercontent.com
        <img
          src={photoURL as string}
          alt=""
          width={size}
          height={size}
          // Google photos can refuse requests that carry another site as the referrer
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(photoURL as string)}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}
