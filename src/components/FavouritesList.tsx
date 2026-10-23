"use client";

import { removeFavourite, type Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";

// "Your places" row under the search box, for signed-in users
export default function FavouritesList({
  favourites,
  onPick,
}: {
  favourites: FavouritesState;
  onPick: (favourite: Favourite) => void;
}) {
  const { uid, items, isLoading, failed } = favourites;
  if (uid === null) return null;

  if (isLoading) {
    return (
      <div className="mt-6 flex gap-2" aria-hidden="true">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-8 w-20 rounded-full bg-line motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }

  if (failed) {
    return <p className="mt-6 text-sm text-muted">Couldn&apos;t load your saved places. Check your connection.</p>;
  }

  if (items.length === 0) {
    return <p className="mt-6 text-sm text-muted">Tip: tap ☆ Save on any place to keep it here.</p>;
  }

  return (
    <section className="mt-6" aria-label="Your saved places">
      <p className="text-sm text-muted">Your places</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((favourite) => (
          <li key={favourite.id} className="flex items-center rounded-full border border-line bg-surface text-sm">
            <button type="button" onClick={() => onPick(favourite)} className="py-1.5 pl-4 pr-2 hover:text-rain">
              {favourite.name}
            </button>
            <button
              type="button"
              onClick={() =>
                removeFavourite(uid, favourite.id).catch((err) =>
                  console.error("[favourites] Could not remove favourite:", err)
                )
              }
              aria-label={`Remove ${favourite.name}`}
              className="py-1.5 pl-1 pr-3 text-muted hover:text-ink"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}