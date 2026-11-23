"use client";

import { useState } from "react";
import Link from "next/link";
import { favouriteLabel, removeFavourite, type Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";
import { AlertIcon, PinIcon, RefreshIcon, SearchIcon, StarIcon } from "@/components/icons";

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
      <div
        className="mt-5 flex flex-col items-center gap-3 rounded-[28px] border border-alert/40 bg-surface px-6 py-7 text-center"
        role="alert"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-alert-soft text-alert">
          <AlertIcon size={26} />
        </span>
        <p className="text-muted">Couldn&apos;t load your favourites. Check your connection.</p>
        <button
          type="button"
          onClick={retry}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-rain font-semibold text-white hover:brightness-110"
        >
          <RefreshIcon size={18} />
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
    setRemoveError("");
    removeFavourite(uid as string, favourite.id).catch((err) => {
      console.error("[favourites] Could not remove favourite:", err);
      setRemoveError(`Couldn't remove ${favouriteLabel(favourite)}. Check your connection and try again.`);
    });
  }

  return (
    <section className="mt-5" aria-label="Your favourites">
      {removeError && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-2xl bg-alert-soft px-4 py-3 text-sm font-medium text-alert"
        >
          <AlertIcon size={18} className="mt-px shrink-0" />
          {removeError}
        </p>
      )}
      <ul className="rounded-3xl bg-surface py-1.5">
        {items.map((favourite, index) => {
          // "Lagos" big, "Nigeria" (or "Algarve, Portugal") underneath
          const label = favouriteLabel(favourite);
          const rest = label.length > favourite.name.length ? label.slice(favourite.name.length + 2) : "";
          return (
            <li
              key={favourite.id}
              className={`flex items-center gap-1 pr-3 ${index > 0 ? "border-t border-line" : ""}`}
            >
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
            </li>
          );
        })}
      </ul>
      <p className="mt-3 px-1 text-sm text-muted">Tap a place to open its forecast.</p>
    </section>
  );
}