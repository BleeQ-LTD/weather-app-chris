import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Favourite = {
  id: string;
  name: string;
  lat: number;
  lon: number;
};

const MAX_NAME_LENGTH = 100; // must match firestore.rules

// The same place always gets the same ID, so saving it twice
// overwrites the existing favourite instead of creating a duplicate
export function favouriteId(lat: number, lon: number): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

// Saves a place to users/{uid}/favourites/{id}
export async function saveFavourite(uid: string, place: { name: string; lat: number; lon: number }) {
  const id = favouriteId(place.lat, place.lon);
  await setDoc(doc(db, "users", uid, "favourites", id), {
    name: place.name.slice(0, MAX_NAME_LENGTH),
    lat: place.lat,
    lon: place.lon,
    createdAt: serverTimestamp(),
  });
}

export async function removeFavourite(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "favourites", id));
}

// Listens to the user's favourites, newest first, and calls onChange whenever they change.
// Firestore shows changes straight away, even before the server confirms them,
// so saving feels instant and still works on a slow connection.
export function subscribeToFavourites(
  uid: string,
  onChange: (items: Favourite[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const favouritesQuery = query(collection(db, "users", uid, "favourites"), orderBy("createdAt", "desc"));

  return onSnapshot(
    favouritesQuery,
    (snapshot) => {
      onChange(
        snapshot.docs.map((document) => {
          const data = document.data();
          return { id: document.id, name: String(data.name), lat: Number(data.lat), lon: Number(data.lon) };
        })
      );
    },
    onError
  );
}