"use client";

import { useEffect, useState } from "react";

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

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      {status === "locating" ? (
        <p role="status" className="text-muted">Finding your location…</p>
      ) : (
        <>
          <h2 className="font-semibold">
            {status === "idle" ? "See the weather where you are" : "Location is off"}
          </h2>
          <p className="mt-1 text-muted" role={status === "idle" ? undefined : "status"}>
            {status === "idle" && "Allow location access and we'll show your local weather. Or search for any city above."}
            {status === "denied" &&
              "No problem. Search for a city above. To use your location later, allow it in your browser's site settings, then try again."}
            {status === "unavailable" && "We couldn't find your location just now. Try again, or search for a city above."}
            {status === "unsupported" && "Your browser can't share your location. Search for a city above instead."}
          </p>

          {status !== "unsupported" && (
            <button
              type="button"
              onClick={() => locate(onLocated, setStatus)}
              className="mt-4 rounded-md bg-rain px-4 py-2 font-medium text-white hover:opacity-90"
            >
              {status === "idle" ? "Use my location" : "Try again"}
            </button>
          )}
        </>
      )}
    </div>
  );
}