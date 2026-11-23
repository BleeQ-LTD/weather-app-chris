"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import FavouritesList from "@/components/FavouritesList";
import { useFavourites } from "@/lib/useFavourites";

// /favourites: the signed-in user's saved places on their own page.
// Tapping a place opens its weather on the home page (/?favourite=<id>).
export default function FavouritesPage() {
  const router = useRouter();
  const authState = useAuth();
  const favourites = useFavourites();

  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-2 pb-10 sm:px-5 sm:pt-4">
      <h1 className="px-1 text-3xl font-bold tracking-tight">Your favourites</h1>

      {authState.status === "checking" ? (
        <p role="status" className="mt-5 px-1 text-muted">Loading…</p>
      ) : authState.status !== "signed-in" ? (
        // Guests and signed-out visitors: explain what an account gives them
        <div className="mt-5 rounded-[28px] bg-surface px-6 py-7">
          <p className="leading-relaxed text-muted">Sign in to save places and see them here on any device.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="flex min-h-12 items-center rounded-[14px] bg-rain px-5 font-semibold text-white hover:brightness-110"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="flex min-h-12 items-center rounded-[14px] border border-line px-5 font-medium hover:bg-accent-soft"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <FavouritesList
          favourites={favourites}
          onPick={(favourite) => router.push(`/?favourite=${encodeURIComponent(favourite.id)}`)}
        />
      )}
    </main>
  );
}