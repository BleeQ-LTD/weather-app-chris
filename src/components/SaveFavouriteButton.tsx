"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { favouriteId, removeFavourite, saveFavourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import type { WeatherData } from "@/lib/weather";

const CONFIRMATION_MS = 3000; // how long the "Saved" message stays visible

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

  if (location.lat === null || location.lon === null) return null;

  const uid = favourites.uid;
  const lat = location.lat;
  const lon = location.lon;
  const id = favouriteId(lat, lon);
  const isSaved = favourites.items.some((favourite) => favourite.id === id);

  function handleClick() {
    setError("");
    setConfirmation("");
    const wasSaved = isSaved;
    const change = wasSaved ? removeFavourite(uid, id) : saveFavourite(uid, { name: location.name, lat, lon });

    change
      .then(() => {
        // Only confirm once Firestore has actually stored the change
        setConfirmation(wasSaved ? "Removed from your places" : "✓ Saved to your places");
      })
      .catch((err) => {
        console.error("[favourites] Could not update favourite:", err);
        setError("Couldn't update your saved places. Try again.");
      });
  }

  return (
    <div className="shrink-0 text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={favourites.isLoading}
        aria-pressed={isSaved}
        className="whitespace-nowrap rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-rain disabled:opacity-60"
      >
        {isSaved ? "★ Saved" : "☆ Save"}
      </button>

      {/* Always on the page so screen readers announce each new message */}
      <p role="status" aria-live="polite" className="mt-1 min-h-4 text-xs text-muted">
        {confirmation}
      </p>

      {error && <p role="alert" className="mt-1 text-xs">{error}</p>}
    </div>
  );
}