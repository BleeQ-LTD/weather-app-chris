"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { favouriteId, removeFavourite, saveFavourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import type { WeatherData } from "@/lib/weather";

const CONFIRMATION_MS = 3000; // how long the "Saved" message stays visible
const TIP_SEEN_KEY = "weather-app:save-tip-seen"; // remembered so the tip only shows once

// Has this browser already seen (or dismissed) the "tap Save" tip?
function hasSeenTip() {
  try {
    return localStorage.getItem(TIP_SEEN_KEY) === "1";
  } catch {
    return true; // storage blocked: don't keep showing the tip
  }
}

// ☆ Save / ★ Saved toggle next to the place name. Guests are asked to sign in instead.
export default function SaveFavouriteButton({
  location,
  favourites,
}: {
  location: WeatherData["location"];
  favourites: FavouritesState;
}) {
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  // Read once when the button first appears (it only renders in the browser, after weather loads)
  const [tipSeen, setTipSeen] = useState(hasSeenTip);

  function dismissTip() {
    setTipSeen(true);
    try {
      localStorage.setItem(TIP_SEEN_KEY, "1");
    } catch {
      // storage blocked: the tip just won't be remembered
    }
  }

  // Hide the confirmation message after a few seconds
  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(""), CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [confirmation]);

  if (favourites.uid === null) {
    return (
      <Link href="/sign-in" className="shrink-0 whitespace-nowrap text-sm text-muted underline hover:text-ink">
        Sign in to save
      </Link>
    );
  }

  // While we check whether this place is already saved, say so instead of showing a dead button
  if (favourites.isLoading) {
    return (
      <span
        role="status"
        className="shrink-0 whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-muted motion-safe:animate-pulse"
      >
        Checking…
      </span>
    );
  }

  if (location.lat === null || location.lon === null) return null;

  const uid = favourites.uid;
  const place = {
    name: location.name,
    region: location.region,
    country: location.country,
    lat: location.lat,
    lon: location.lon,
  };
  const id = favouriteId(place.name, place.country);
  const isSaved = favourites.items.some((favourite) => favourite.id === id);

  // One-time tip, next to the button itself, the first time someone could save a place
  const showTip = !tipSeen && !isSaved;

  function handleClick() {
    dismissTip(); // they've found the button, so the tip has done its job
    setError("");
    setConfirmation("");
    const wasSaved = isSaved;
    const change = wasSaved ? removeFavourite(uid, id) : saveFavourite(uid, place);

    change
      .then(() => {
        // Only confirm once Firestore has actually stored the change
        setConfirmation(wasSaved ? "Removed from your favourites" : "✓ Saved to your favourites");
      })
      .catch((err) => {
        console.error("[favourites] Could not update favourite:", err);
        setError("Couldn't update your favourites. Check your connection and try again.");
      });
  }

  return (
    <div className="relative shrink-0 text-right">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSaved}
        className="whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-rain"
      >
        {isSaved ? "★ Saved" : "☆ Save"}
      </button>

      {showTip && (
        <div
          role="note"
          className="absolute right-0 top-full z-10 mt-2 w-60 rounded-md border border-line bg-surface p-3 text-left text-sm shadow-md"
        >
          <p>Tap ☆ Save to keep this place in your favourites, on any device.</p>
          <button type="button" onClick={dismissTip} className="mt-2 text-sm font-medium text-rain underline">
            Got it
          </button>
        </div>
      )}

      {/* Always on the page so screen readers announce each new message */}
      <p role="status" aria-live="polite" className="mt-1 min-h-4 text-xs text-muted">
        {confirmation}
      </p>

      {error && <p role="alert" className="mt-1 text-xs">{error}</p>}
    </div>
  );
}