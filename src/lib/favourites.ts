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

// Turns text into a safe, lowercase ID part: "São Paulo" -> "sao-paulo"
function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // anything else becomes a dash
    .replace(/^-+|-+$/g, ""); // no dashes at the start or end
}

// The same place always gets the same ID, built from its name and country
// (for example "lagos_nigeria"). We don't use coordinates, because two searches
// for the same city can return slightly different coordinates, which would
// save the city twice or show it as "not saved".
export function favouriteId(name: string, country: string): string {
  return `${slug(name)}_${slug(country)}`;
}

// Saves a place to users/{uid}/favourites/{id}. Saving the same place again
// overwrites the same document, so it never creates a duplicate.
export async function saveFavourite(
  uid: string,
  place: { name: string; country: string; lat: number; lon: number }
) {
  const id = favouriteId(place.name, place.country);
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

// Listens to the user's favourites, newest first.
// fromCache tells the caller whether this list came from the browser's cached copy
// rather than the server. When offline, Firestore can hand back an empty cached list,
// which must not be mistaken for "this user has no favourites".
export function subscribeToFavourites(
  uid: string,
  onChange: (items: Favourite[], fromCache: boolean) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const favouritesQuery = query(collection(db, "users", uid, "favourites"), orderBy("createdAt", "desc"));

  return onSnapshot(
    favouritesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((document) => {
        const data = document.data();
        return { id: document.id, name: String(data.name), lat: Number(data.lat), lon: Number(data.lon) };
      });
      onChange(items, snapshot.metadata.fromCache);
    },
    onError
  );
}