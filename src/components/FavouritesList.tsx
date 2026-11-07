"use client";

import { useState } from "react";
import Link from "next/link";
import { favouriteLabel, removeFavourite, type Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";

// The list on the Favourites page: loading, slow, error (with Try again),
// empty, or the saved places. Only one of these shows at a time.
export default function FavouritesList({
  favourites,
  onPick,
}: {
  favourites: FavouritesState;
  onPick: (favourite: Favourite) => void;
}) {
  const { uid, items, isLoading, isSlow, failed, retry } = favourites;
  const [removeError, setRemoveError] = useState("");

  if (uid === null) return null;

  if (isLoading) {
    return (
      <div className="mt-6" role="status">
        <p className="sr-only">Loading your favourites…</p>
        <div className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-14 rounded-md bg-line motion-safe:animate-pulse" />
          ))}
        </div>
        {isSlow && (
          <p className="mt-3 text-sm text-muted">
            This is taking longer than usual. Check your internet connection.
          </p>
        )}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm" role="alert">
        <p className="text-muted">Couldn&apos;t load your favourites. Check your connection.</p>
        <button
          type="button"
          onClick={retry}
          className="rounded-md border border-line bg-surface px-3 py-1.5 hover:border-rain"
        >
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-6">
        <p className="text-muted">No favourites yet.</p>
        <p className="mt-1 text-sm text-muted">Search for a place and tap ☆ Save to keep it here.</p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md border border-line bg-surface px-4 py-2 hover:border-rain"
        >
          Find a place
        </Link>
      </div>
    );
  }

  function remove(favourite: Favourite) {
    setRemoveError("");
    removeFavourite(uid as string, favourite.id).catch((err) => {
      console.error("[favourites] Could not remove favourite:", err);
      setRemoveError(`Couldn't remove ${favouriteLabel(favourite)}. Check your connection and try again.`);
    });
  }

  return (
    <section className="mt-6" aria-label="Your favourites">
      {removeError && (
        <p role="alert" className="mb-3 border-l-4 border-alert bg-surface px-3 py-2 text-sm">
          {removeError}
        </p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {items.map((favourite) => {
          // "Lagos" big, "Nigeria" (or "Algarve, Portugal") underneath
          const label = favouriteLabel(favourite);
          const rest = label.length > favourite.name.length ? label.slice(favourite.name.length + 2) : "";
          return (
            <li key={favourite.id} className="flex items-center justify-between gap-3 py-3">
              <button
                type="button"
                onClick={() => onPick(favourite)}
                className="min-w-0 flex-1 text-left hover:text-rain"
              >
                <span className="block font-medium">{favourite.name}</span>
                {rest && <span className="block text-sm text-muted">{rest}</span>}
              </button>
              <button
                type="button"
                onClick={() => remove(favourite)}
                aria-label={`Remove ${label} from favourites`}
                className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-muted hover:border-rain hover:text-ink"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}