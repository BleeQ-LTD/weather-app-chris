"use client";

import { useSyncExternalStore } from "react";
import type { Suggestion } from "@/lib/weather";

// The last few places the user actually opened, kept in this browser only.
// Small on purpose: just what's needed to show the place and load its weather.
export type RecentPlace = {
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
};

export const MAX_RECENT = 5;
const STORAGE_KEY = "weather-app:search-history";

// ---- Pure list helpers (no storage), so they're easy to test ----

// Two entries are the same place when name and country match, ignoring case and accents
// (like favourites, coordinates are not used: two searches can return slightly different ones)
export function recentKey(place: Pick<RecentPlace, "name" | "country">): string {
  const clean = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase();
  return `${clean(place.name)}|${clean(place.country)}`;
}

// In:  the current list and a place that was just opened.
// Out: a new list with that place first, any older copy removed, and at most 5 places.
export function addRecent(list: RecentPlace[], place: RecentPlace): RecentPlace[] {
  const entry: RecentPlace = {
    name: place.name,
    region: place.region,
    country: place.country,
    lat: place.lat,
    lon: place.lon,
  };
  const key = recentKey(entry);
  return [entry, ...list.filter((item) => recentKey(item) !== key)].slice(0, MAX_RECENT);
}

// In:  the current list and the key of one place.  Out: the list without it.
export function removeRecent(list: RecentPlace[], key: string): RecentPlace[] {
  return list.filter((item) => recentKey(item) !== key);
}

// Keeps only well-formed entries, so a damaged or old stored value can't break the page
export function parseRecent(raw: string | null): RecentPlace[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is RecentPlace =>
          typeof item === "object" &&
          item !== null &&
          typeof item.name === "string" &&
          item.name !== "" &&
          typeof item.region === "string" &&
          typeof item.country === "string" &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lon)
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

// A recent place in the shape the search box and weather lookup already use
export function recentAsSuggestion(place: RecentPlace): Suggestion {
  return { id: `recent:${recentKey(place)}`, ...place, kind: "city" };
}

// ---- Stored in localStorage, shared by every search box on the page ----

const listeners = new Set<() => void>();
const EMPTY: RecentPlace[] = [];
// React needs the same array back until the stored value changes, so remember the last one read
let cached: { raw: string | null; list: RecentPlace[] } = { raw: null, list: EMPTY };

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked
  }
}

function snapshot(): RecentPlace[] {
  const raw = readRaw();
  if (raw !== cached.raw) cached = { raw, list: parseRecent(raw) };
  return cached.list;
}

function save(list: RecentPlace[]) {
  try {
    if (list.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage blocked: history just isn't kept
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Changes made in another tab
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Call when a place is actually opened (picked suggestion, Search best match, favourite)
export function rememberPlace(place: RecentPlace) {
  save(addRecent(snapshot(), place));
}

export function forgetPlace(key: string) {
  save(removeRecent(snapshot(), key));
}

export function clearRecent() {
  save([]);
}

// The recent places, most recent first. Empty on the server (no localStorage there).
export function useRecentPlaces(): RecentPlace[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
