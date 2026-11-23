"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { favouriteId, removeFavourite, saveFavourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import type { WeatherData } from "@/lib/weather";
import { AlertIcon, CheckIcon, StarIcon } from "@/components/icons";

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

  // Lives inside the hero card, so it uses the card's colours (hero-*) to stay readable
  const pill =
    "inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-full border border-hero-save-line bg-hero-save pl-3.5 pr-[18px] text-[15px] font-semibold text-hero-ink";

  if (favourites.uid === null) {
    return (
      <Link href="/sign-in" className={`${pill} hover:brightness-95`}>
        <StarIcon size={18} />
        Sign in to save
      </Link>
    );
  }

  // While we check whether this place is already saved, say so instead of showing a dead button
  if (favourites.isLoading) {
    return (
      <span role="status" className={`${pill} text-hero-muted motion-safe:animate-pulse`}>
        <StarIcon size={18} />
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
        setConfirmation(wasSaved ? "Removed from your favourites" : "Saved to your favourites");
      })
      .catch((err) => {
        console.error("[favourites] Could not update favourite:", err);
        setError("Couldn't update your favourites. Check your connection and try again.");
      });
  }

  return (
    <div className="relative flex flex-col items-start gap-2">
      <button type="button" onClick={handleClick} aria-pressed={isSaved} className={`${pill} hover:brightness-95`}>
        {isSaved ? (
          <StarIcon size={18} filled className="text-sun" />
        ) : (
          <StarIcon size={18} />
        )}
        {isSaved ? "Saved" : "Save"}
      </button>

      {showTip && (
        <div
          role="note"
          className="absolute top-full left-0 z-10 mt-2 w-64 rounded-2xl border border-line bg-surface p-4 text-left text-sm text-ink shadow-pop"
        >
          <p>Tap Save to keep this place in your favourites, on any device.</p>
          <button
            type="button"
            onClick={dismissTip}
            className="mt-2 min-h-11 text-sm font-semibold text-link underline"
          >
            Got it
          </button>
        </div>
      )}

      {/* Always on the page so screen readers announce each new message */}
      <p
        role="status"
        aria-live="polite"
        className="flex min-h-5 items-center gap-1.5 text-sm font-medium text-hero-ok"
      >
        {confirmation && confirmation.startsWith("Saved") && <CheckIcon size={16} />}
        {confirmation}
      </p>

      {error && (
        <p role="alert" className="-mt-1 flex items-center gap-1.5 text-sm font-medium text-hero-err">
          <AlertIcon size={16} />
          {error}
        </p>
      )}
    </div>
  );
}