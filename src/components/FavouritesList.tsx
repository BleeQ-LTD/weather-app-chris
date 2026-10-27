"use client";

import { removeFavourite, type Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import Link from "next/link";

// "Your favourites" row under the search box, for signed-in users
export default function FavouritesList({
  favourites,
  onPick,
}: {
  favourites: FavouritesState;
  onPick: (favourite: Favourite) => void;
}) {
  const { uid, items, isLoading, isSlow, failed, retry } = favourites;
  // Visitors who aren't signed in: explain what an account gives THEM
  if (uid === null) {
    return (
      <p className="mt-6 text-sm text-muted">
        Want to keep your favourite places?{" "}
        <Link href="/sign-up" className="underline hover:text-ink">Create a free account</Link>
        {" "}to save them and see them on any device.
      </p>
    );
  }
  if (isLoading) {
    return (
      <div className="mt-6" role="status">
        <p className="sr-only">Loading your favourites…</p>
        <div className="flex gap-2" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-8 w-20 rounded-full bg-line motion-safe:animate-pulse" />
          ))}
        </div>
        {isSlow && (
          <p className="mt-2 text-sm text-muted">
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
    return <p className="mt-6 text-sm text-muted">Tip: tap ☆ Save on any place to add it to your favourites.</p>;
  }

  return (
    <section className="mt-6" aria-label="Your favourites">
      <p className="text-sm text-muted">Your favourites</p>
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
              aria-label={`Remove ${favourite.name} from favourites`}
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