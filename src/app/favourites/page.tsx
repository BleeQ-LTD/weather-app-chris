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
    <main className="mx-auto w-full max-w-xl px-5 py-8 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your favourites</h1>

      {authState.status === "checking" ? (
        <p role="status" className="mt-6 text-muted">Loading…</p>
      ) : authState.status !== "signed-in" ? (
        // Guests and signed-out visitors: explain what an account gives them
        <div className="mt-6">
          <p className="text-muted">Sign in to save places and see them here on any device.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/sign-in" className="rounded-md bg-rain px-4 py-2 font-medium text-white hover:opacity-90">
              Sign in
            </Link>
            <Link href="/sign-up" className="rounded-md border border-line bg-surface px-4 py-2 hover:border-rain">
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