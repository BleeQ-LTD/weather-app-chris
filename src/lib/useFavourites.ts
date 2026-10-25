import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { subscribeToFavourites, type Favourite } from "@/lib/favourites";

const SLOW_AFTER_MS = 4_000; // after this, tell the user it's taking a while
const FAIL_AFTER_MS = 10_000; // after this, show a connection error with "Try again"

export type FavouritesState = {
  uid: string | null; // null for guests and signed-out visitors
  items: Favourite[];
  isLoading: boolean;
  isSlow: boolean; // still loading after SLOW_AFTER_MS
  failed: boolean; // couldn't load (error or timed out)
  retry: () => void;
};

type Loaded = { key: string; items: Favourite[]; failed: boolean };

// Gives any component the signed-in user's favourites, kept up to date live
export function useFavourites(): FavouritesState {
  const authState = useAuth();
  const uid = authState.status === "signed-in" ? authState.user.uid : null;

  const [attempt, setAttempt] = useState(0); // "Try again" increases this to start a fresh load
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [slowKey, setSlowKey] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const key = `${uid}:${attempt}`;
    let heardFromServer = false;

    const slowTimer = setTimeout(() => setSlowKey(key), SLOW_AFTER_MS);
    const failTimer = setTimeout(() => {
      if (!heardFromServer) setLoaded({ key, items: [], failed: true });
    }, FAIL_AFTER_MS);

    const unsubscribe = subscribeToFavourites(
      uid,
      (items, fromCache) => {
        // Wait for the server's first answer. An empty list from the cache while
        // offline doesn't mean the user has no favourites.
        if (fromCache && !heardFromServer) return;
        heardFromServer = true;
        clearTimeout(slowTimer);
        clearTimeout(failTimer);
        setLoaded({ key, items, failed: false });
      },
      (error) => {
        console.error("[favourites] Could not load favourites:", error);
        clearTimeout(slowTimer);
        clearTimeout(failTimer);
        setLoaded({ key, items: [], failed: true });
      }
    );

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(failTimer);
      unsubscribe();
    };
  }, [uid, attempt]);

  // Only trust data loaded for the current user and the latest attempt
  const key = uid ? `${uid}:${attempt}` : null;
  const isCurrent = key !== null && loaded?.key === key;
  const isLoading = key !== null && !isCurrent;

  return {
    uid,
    items: isCurrent && loaded ? loaded.items : [],
    isLoading,
    isSlow: isLoading && slowKey === key,
    failed: isCurrent && loaded ? loaded.failed : false,
    retry: () => setAttempt((count) => count + 1),
  };
}