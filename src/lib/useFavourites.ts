import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { subscribeToFavourites, type Favourite } from "@/lib/favourites";

export type FavouritesState = {
  uid: string | null; // null for guests and signed-out visitors
  items: Favourite[];
  isLoading: boolean;
  failed: boolean;
};

type Loaded = { forUid: string | null; items: Favourite[]; failed: boolean };

// Gives any component the signed-in user's favourites, kept up to date live
export function useFavourites(): FavouritesState {
  const authState = useAuth();
  const uid = authState.status === "signed-in" ? authState.user.uid : null;
  const [loaded, setLoaded] = useState<Loaded>({ forUid: null, items: [], failed: false });

  useEffect(() => {
    if (!uid) return;
    return subscribeToFavourites(
      uid,
      (items) => setLoaded({ forUid: uid, items, failed: false }),
      (error) => {
        console.error("[favourites] Could not load favourites:", error);
        setLoaded({ forUid: uid, items: [], failed: true });
      }
    );
  }, [uid]);

  // Only trust data that was loaded for the user who is signed in right now
  const isCurrent = uid !== null && loaded.forUid === uid;

  return {
    uid,
    items: isCurrent ? loaded.items : [],
    isLoading: uid !== null && !isCurrent,
    failed: isCurrent && loaded.failed,
  };
}