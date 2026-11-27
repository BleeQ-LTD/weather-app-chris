"use client";

import { useState } from "react";
import Link from "next/link";
import { favouriteLabel, removeFavourite, type Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import { AlertIcon, PinIcon, RefreshIcon, SearchIcon, StarIcon } from "@/components/icons";
import { browserIsOnline, favouriteErrorReason, favouritesLoadMessage } from "@/lib/favouriteErrors";

// The list on the Favourites page: loading, slow, error (with Try again),
// empty, or the saved places. Only one of these shows at a time.
export default function FavouritesList({
  favourites,
  onPick,
}: {
  favourites: FavouritesState;
  onPick: (favourite: Favourite) => void;
}) {
  const { uid, items, isLoading, isSlow, failed, failure, retry } = favourites;
  // Which place failed to be removed and why, shown under that place's row
  const [removeError, setRemoveError] = useState<{ id: string; message: string } | null>(null);

  if (uid === null) return null;

  if (isLoading) {
    return (
      <div className="mt-5" role="status">
        <p className="sr-only">Loading your favourites…</p>
        <div className="space-y-2 rounded-3xl bg-surface p-2" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <div key={key} className="h-16 rounded-2xl bg-line motion-safe:animate-pulse" />
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
      // Small and in place of the list, with the retry right next to it
      <div
        role="alert"
        className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-alert-soft py-2 pr-2 pl-4 text-sm font-medium text-alert"
      >
        <AlertIcon size={18} className="shrink-0" />
        <p className="min-w-0 flex-1">
          {favouritesLoadMessage(failure, browserIsOnline())}
        </p>
        <button
          type="button"
          onClick={retry}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-surface px-3.5 font-semibold text-link hover:bg-accent-soft"
        >
          <RefreshIcon size={16} />
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-5 flex flex-col items-center gap-3.5 rounded-[28px] bg-surface px-6 py-8 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-sun-soft text-sun-ink">
          <StarIcon size={34} strokeWidth={1.8} />
        </span>
        <h2 className="text-[22px] font-bold">No favourites yet</h2>
        <p className="leading-relaxed text-muted">Search for a place and tap Save to keep it here.</p>
        <Link
          href="/"
          className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-rain font-semibold text-white hover:brightness-110"
        >
          <SearchIcon size={18} />
          Find a place
        </Link>
      </div>
    );
  }

  function remove(favourite: Favourite) {
    setRemoveError(null);
    const failed = `Couldn't remove ${favouriteLabel(favourite)}.`;
    // Offline, Firestore would wait silently, so say so straight away
    if (!browserIsOnline()) {
      setRemoveError({ id: favourite.id, message: `${failed} ${favouriteErrorReason(null, false)}` });
      return;
    }
    removeFavourite(uid as string, favourite.id).catch((err) => {
      console.error("[favourites] Could not remove favourite:", err);
      setRemoveError({ id: favourite.id, message: `${failed} ${favouriteErrorReason(err, browserIsOnline())}` });
    });
  }

  return (
    <section className="mt-4" aria-label="Your favourites">
      <ul className="rounded-3xl bg-surface py-1.5">
        {items.map((favourite, index) => {
          // "Lagos" big, "Nigeria" (or "Algarve, Portugal") underneath
          const label = favouriteLabel(favourite);
          const rest = label.length > favourite.name.length ? label.slice(favourite.name.length + 2) : "";
          const error = removeError?.id === favourite.id ? removeError.message : "";
          return (
            <li key={favourite.id} className={index > 0 ? "border-t border-line" : ""}>
              <div className="flex items-center gap-1 pr-3">
                <button
                  type="button"
                  onClick={() => onPick(favourite)}
                  className="flex min-h-[72px] min-w-0 flex-1 items-center gap-3.5 rounded-[18px] py-3 pr-2 pl-4 text-left hover:bg-sky"
                >
                  <PinIcon size={22} className="shrink-0 text-link" />
                  <span className="min-w-0">
                    <span className="block truncate text-[17px] font-semibold">{favourite.name}</span>
                    {rest && <span className="block truncate text-sm text-muted">{rest}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(favourite)}
                  aria-label={`Remove ${label} from favourites`}
                  className="h-11 shrink-0 rounded-xl border border-line px-3.5 text-sm font-medium text-muted hover:border-alert/40 hover:bg-alert-soft hover:text-alert"
                >
                  Remove
                </button>
              </div>
              {/* The message sits right under the place it's about */}
              {error && (
                <p role="alert" className="flex items-start gap-1.5 px-4 pb-3 text-sm font-medium text-alert">
                  <AlertIcon size={16} className="mt-0.5 shrink-0" />
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-sm text-muted">Tap a place to open its forecast.</p>
    </section>
  );
}