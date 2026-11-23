"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatPlace, matchesPlace, weatherQueryFor } from "@/lib/weather";
import type { Suggestion, WeatherData, WeatherErrorBody } from "@/lib/weather";

// One place's weather on the Compare page. Each side has its own lookup, so one
// side loading or failing never affects the other.
export type LookupState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "success"; data: WeatherData }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string };

const MIN_SEARCH_LENGTH = 2; // the search route needs at least 2 characters

function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

// The real reason a request couldn't complete: offline, or the service didn't answer
function connectionMessage() {
  return isOnline()
    ? "The weather service didn't answer. Try again in a moment."
    : "You're offline. Reconnect and try again.";
}

// Show the place the user picked (e.g. "Edo"), not WeatherAPI's nearest town to its coordinates
function withPlaceName(data: WeatherData, place?: Suggestion): WeatherData {
  if (!place) return data;
  return {
    ...data,
    location: {
      ...data.location,
      name: place.name,
      region: place.region,
      country: place.country,
      lat: place.lat,
      lon: place.lon,
    },
  };
}

// Out: the current state plus actions.
//  search(text)  - find the best matching place (like pressing Search on the home page), then load it
//  choose(place) - load a place picked from the suggestions
//  retry()       - repeat the last search or load
//  clear()       - cancel anything loading and go back to empty
export function useWeatherLookup() {
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const active = useRef<AbortController | null>(null);
  // What Try again repeats
  const lastAction = useRef<{ type: "choose"; place: Suggestion } | { type: "search"; text: string } | null>(null);

  // A newer request always replaces an older one, so a slow answer can't overwrite a newer place
  function start() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    return controller;
  }
  const isCurrent = (controller: AbortController) => active.current === controller && !controller.signal.aborted;

  // Cancel anything in flight if the page is left
  useEffect(() => () => active.current?.abort(), []);

  const load = useCallback(async (place: Suggestion, controller: AbortController) => {
    setState({ status: "loading", label: formatPlace(place) });
    try {
      const response = await fetch(`/api/weather?q=${encodeURIComponent(weatherQueryFor(place))}`, {
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (!isCurrent(controller)) return;

      if (response.ok && body) {
        setState({ status: "success", data: withPlaceName(body as WeatherData, place) });
        return;
      }
      const error = (body as WeatherErrorBody | null)?.error;
      if (error?.code === "LOCATION_NOT_FOUND") {
        setState({ status: "not-found", message: error.message });
        return;
      }
      // Our route already words its errors with the real reason
      setState({ status: "error", message: error?.message ?? "The weather service had a problem. Try again in a moment." });
    } catch (err) {
      if (!isCurrent(controller)) return;
      console.error("[compare] Weather request failed:", err);
      setState({ status: "error", message: connectionMessage() });
    }
  }, []);

  const choose = useCallback(
    (place: Suggestion) => {
      lastAction.current = { type: "choose", place };
      void load(place, start());
    },
    [load]
  );

  const search = useCallback(
    async (text: string) => {
      lastAction.current = { type: "search", text };
      const controller = start();
      if (text.trim().length < MIN_SEARCH_LENGTH) {
        setState({ status: "not-found", message: "Type at least 2 letters, then pick a place from the list." });
        return;
      }
      setState({ status: "loading", label: text });

      let matches: Suggestion[];
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        matches = (await response.json()) as Suggestion[];
        if (!isCurrent(controller)) return;
      } catch (err) {
        if (!isCurrent(controller)) return;
        console.error("[compare] Place search failed:", err);
        setState({
          status: "error",
          message: isOnline()
            ? "Place search is unavailable right now. Try again in a moment."
            : "You're offline. Reconnect and try again.",
        });
        return;
      }

      // The search service sometimes returns unrelated places, so keep only real matches
      const [best] = matches.filter((place) => matchesPlace(text, place));
      if (!best) {
        setState({
          status: "not-found",
          message: `We couldn't find "${text}". Check the spelling, or pick a suggestion as you type.`,
        });
        return;
      }
      void load(best, controller);
    },
    [load]
  );

  const retry = useCallback(() => {
    const last = lastAction.current;
    if (last?.type === "choose") choose(last.place);
    else if (last?.type === "search") void search(last.text);
  }, [choose, search]);

  const clear = useCallback(() => {
    active.current?.abort();
    lastAction.current = null;
    setState({ status: "idle" });
  }, []);

  return { state, search, choose, retry, clear };
}
