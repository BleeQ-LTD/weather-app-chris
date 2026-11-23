"use client";

import { useEffect, useState } from "react";
import { LocateIcon, LocateOffIcon, RefreshIcon } from "@/components/icons";

type Status =
  | "idle" // haven't asked yet: show the "Use my location" button
  | "locating" // waiting for the browser
  | "denied" // the user (or their browser settings) refused
  | "unavailable" // allowed, but the device couldn't find a position in time
  | "unsupported"; // this browser can't share location at all

const LOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true, // city-level is enough for weather, and it's faster
  timeout: 10_000, // give up after 10 seconds
  maximumAge: 10 * 60_000, // a position from the last 10 minutes is fine
};

// Asks the browser for the user's position and reports what happened
function locate(
  onLocated: (lat: number, lon: number) => void,
  setStatus: (status: Status) => void
) {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    setStatus("unsupported");
    return;
  }
  setStatus("locating");
  navigator.geolocation.getCurrentPosition(
    (position) => onLocated(position.coords.latitude, position.coords.longitude),
    (error) => setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
    LOCATION_OPTIONS
  );
}

// The first thing a visitor sees: an offer to show the weather where they are.
// If they refuse, we respect it and point them to search. We never guess their
// location from their IP address.
export default function LocationPrompt({
  onLocated,
}: {
  // Must be stable (wrapped in useCallback by the parent)
  onLocated: (lat: number, lon: number) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");

  // If they allowed location on an earlier visit, use it straight away (no prompt).
  // If they blocked it before, say so instead of offering a button that can't work.
  useEffect(() => {
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((permission) => {
        if (cancelled) return;
        if (permission.state === "granted") locate(onLocated, setStatus);
        if (permission.state === "denied") setStatus("denied");
      })
      .catch(() => {
        // Some browsers can't report the permission state; the button still works
      });
    return () => {
      cancelled = true;
    };
  }, [onLocated]);

  if (status === "locating") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-4">
        <span
          aria-hidden="true"
          className="h-5 w-5 shrink-0 rounded-full border-[3px] border-line border-t-rain motion-safe:animate-spin"
        />
        <p role="status" className="font-medium text-muted">Finding your location…</p>
      </div>
    );
  }

  // Location couldn't be used: a compact card that says why, with Try again next to it
  if (status !== "idle") {
    const { title, reason } = PROBLEMS[status];
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-surface p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-soft text-sun-ink">
          <LocateOffIcon size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">{reason}</p>
          {status !== "unsupported" && (
            <button
              type="button"
              onClick={() => locate(onLocated, setStatus)}
              className="mt-2.5 flex h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-link px-3.5 text-sm font-semibold text-link hover:bg-accent-soft"
            >
              <RefreshIcon size={16} />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  // First visit: a friendly offer, kept short so the search box stays the focus
  return (
    <div className="flex flex-col items-center gap-3 rounded-[28px] bg-surface px-6 pt-6 pb-5 text-center sm:px-8">
      <LocationArt />
      <h2 className="text-[22px] font-bold tracking-tight sm:text-2xl">See the weather where you are</h2>
      <p className="leading-relaxed text-muted">
        Allow location access and we&apos;ll show your local weather. Or search for any city above.
      </p>
      <button
        type="button"
        onClick={() => locate(onLocated, setStatus)}
        className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-rain font-semibold text-white hover:brightness-110"
      >
        <LocateIcon size={20} />
        Use my location
      </button>
      <p className="text-[13px] text-muted">We only use it to find your forecast.</p>
    </div>
  );
}

// Why location couldn't be used, in plain words, with what to do next
const PROBLEMS: Record<Exclude<Status, "idle" | "locating">, { title: string; reason: string }> = {
  denied: {
    title: "Location is off",
    reason:
      "Search for a city above. To use your location, allow it in your browser's site settings (the lock icon next to the address), then try again.",
  },
  unavailable: {
    title: "Couldn't find your location",
    reason: "Your device didn't get a position in time. Try again, or search for a city above.",
  },
  unsupported: {
    title: "Location isn't available",
    reason: "Your browser can't share your location. Search for a city above instead.",
  },
};

// A pin with the sun behind it, for the first-visit card
function LocationArt() {
  return (
    <svg width="84" height="84" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" className="fill-accent-soft" />
      <circle cx="44" cy="20" r="7" fill="#F59E0B" />
      <path d="M44 8.5v2.5M55.5 20H53M52.1 11.9l-1.8 1.8M35.9 11.9l1.8 1.8" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 52s-12-10.3-12-19.5a12 12 0 0 1 24 0C42 41.7 30 52 30 52z" className="fill-rain" />
      <circle cx="30" cy="32.5" r="4.5" className="fill-surface" />
    </svg>
  );
}