"use client";

import { useCallback, useRef, useState } from "react";
import SearchForm from "@/components/SearchForm";
import WeatherResults from "@/components/WeatherResults";
import { formatPlace, matchesPlace } from "@/lib/weather";
import type { Suggestion, WeatherData, WeatherErrorBody } from "@/lib/weather";

// Every screen the app can be on. Only one is possible at a time.
type ViewState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "choose"; query: string; options: Suggestion[] }
  | { status: "success"; data: WeatherData }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string; query: string; label: string };

const QUICK_PICKS = ["Lagos", "Abuja", "Accra", "London"];
const MIN_SEARCH_LENGTH = 2; // the search route needs at least 2 characters

export default function Home() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  // Cancel any request still in flight so an older, slower response
  // can't overwrite a newer one
  function startRequest() {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    return controller;
  }

  // True only while this request is still the newest one. Checked after every
  // await, because a request can be replaced while its response is arriving
  // (even after fetch() resolved, reading the body can still be in progress).
  function isCurrent(controller: AbortController) {
    return activeRequest.current === controller && !controller.signal.aborted;
  }

  // Step 2: get the weather.
  // apiQuery is what we send ("Lagos" or "id:12345");
  // label is what the user sees ("Lagos, Nigeria")
  const fetchWeather = useCallback(
    async (apiQuery: string, label: string, controller = startRequest()) => {
      setView({ status: "loading", query: label });

      try {
        const response = await fetch(
          `/api/weather?q=${encodeURIComponent(apiQuery)}`,
          { signal: controller.signal }
        );
        if (!isCurrent(controller)) return;

        const body = await response.json().catch(() => null);
        if (!isCurrent(controller)) return; // replaced while the body was arriving

        if (response.ok && body) {
          setView({ status: "success", data: body as WeatherData });
          return;
        }

        const error = (body as WeatherErrorBody | null)?.error;

        if (error?.code === "LOCATION_NOT_FOUND") {
          setView({ status: "not-found", message: error.message });
          inputRef.current?.select(); // ready for the user to retype
          return;
        }

        setView({
          status: "error",
          message: error?.message ?? "The weather service had a problem. Try again.",
          query: apiQuery,
          label,
        });
      } catch {
        if (!isCurrent(controller)) return; // replaced by a newer search
        setView({
          status: "error",
          message: "Couldn't connect. Check your internet connection and try again.",
          query: apiQuery,
          label,
        });
      }
    },
    []
  );

  // Step 1: when Search is pressed, check how many places match first
  const handleSearch = useCallback(
    async (text: string) => {
      // Too short to search: go straight to the weather lookup
      if (text.length < MIN_SEARCH_LENGTH) {
        fetchWeather(text, text);
        return;
      }

      const controller = startRequest();
      setView({ status: "loading", query: text });

      let matches: Suggestion[];
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`, {
          signal: controller.signal,
        });
        if (!isCurrent(controller)) return;
        if (!response.ok) throw new Error(`Search failed: ${response.status}`);
        matches = (await response.json()) as Suggestion[];
        if (!isCurrent(controller)) return; // replaced while the body was arriving
      } catch {
        if (!isCurrent(controller)) return;
        // If the search check fails, fall back to the old behaviour:
        // let WeatherAPI pick its best match for the typed text
        fetchWeather(text, text, controller);
        return;
      }

      if (matches.length === 0) {
        setView({
          status: "not-found",
          message: `We couldn't find "${text}". Check the spelling or try a nearby city.`,
        });
        inputRef.current?.select();
        return;
      }

      // One match that really is what was typed: go straight to its weather.
      // A single match that looks unrelated (like "edo" -> an airport in
      // Turkey) falls through to the "did you mean" screen instead.
      if (matches.length === 1 && matchesPlace(text, matches[0])) {
        const [place] = matches;
        fetchWeather(`id:${place.id}`, formatPlace(place), controller);
        return;
      }

      // More than one match, or one doubtful match: let the user choose
      setView({ status: "choose", query: text, options: matches });
    },
    [fetchWeather]
  );

  function choosePlace(place: Suggestion) {
    const label = formatPlace(place);
    setQuery(label);
    fetchWeather(`id:${place.id}`, label);
  }

  function pickCity(city: string) {
    setQuery(city);
    handleSearch(city);
  }

  // Short text for screen readers, announced whenever the state changes
  const announcement = {
    idle: "",
    loading: view.status === "loading" ? `Loading weather for ${view.query}` : "",
    choose:
      view.status === "choose"
        ? view.options.length === 1
          ? `No exact match for ${view.query}. Did you mean ${formatPlace(view.options[0])}?`
          : `${view.options.length} places match ${view.query}. Choose one.`
        : "",
    success: view.status === "success" ? `Showing weather for ${view.data.location.name}` : "",
    "not-found": view.status === "not-found" ? view.message : "",
    error: view.status === "error" ? view.message : "",
  }[view.status];

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Weather</h1>
        <p className="text-muted">Current conditions and a 3-day forecast.</p>
      </header>

      <SearchForm
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onSelectSuggestion={choosePlace}
        isLoading={view.status === "loading"}
        inputRef={inputRef}
      />

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <section className="mt-10" aria-busy={view.status === "loading"}>
        {view.status === "idle" && (
          <div>
            <p className="text-lg">Search for a place to see its weather.</p>
            <p className="mt-4 text-sm text-muted">Or pick one:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_PICKS.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => pickCity(city)}
                  className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm hover:border-rain"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {view.status === "loading" && (
          <div>
            <p className="text-muted">Loading weather for {view.query}…</p>
            <div className="mt-6 space-y-4 motion-safe:animate-pulse" aria-hidden="true">
              <div className="h-8 w-40 rounded bg-line" />
              <div className="h-16 w-56 rounded bg-line" />
              <div className="h-20 w-full rounded bg-line" />
            </div>
          </div>
        )}

        {view.status === "choose" && (
          <div className="border-l-4 border-rain pl-4">
            <h2 className="font-semibold">
              {view.options.length === 1
                ? <>No exact match for &ldquo;{view.query}&rdquo;</>
                : <>More than one place matches &ldquo;{view.query}&rdquo;</>}
            </h2>
            <p className="mt-1 text-muted">
              {view.options.length === 1
                ? "Did you mean this place? Or add a country, for example Edo, Nigeria."
                : "Choose the one you mean."}
            </p>
            <ul className="mt-3 space-y-2">
              {view.options.map((place) => {
                const rest = formatPlace(place).slice(place.name.length + 2);
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      onClick={() => choosePlace(place)}
                      className="w-full rounded-md border border-line bg-surface px-3 py-2 text-left hover:border-rain"
                    >
                      <span className="font-medium">{place.name}</span>
                      {rest && <span className="text-muted">, {rest}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {view.status === "not-found" && (
          <div className="border-l-4 border-alert pl-4">
            <h2 className="font-semibold">Location not found</h2>
            <p className="mt-1">{view.message}</p>
          </div>
        )}

        {view.status === "error" && (
          <div className="border-l-4 border-alert pl-4">
            <h2 className="font-semibold">Weather unavailable</h2>
            <p className="mt-1">{view.message}</p>
            <button
              type="button"
              onClick={() => fetchWeather(view.query, view.label)}
              className="mt-3 rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-rain"
            >
              Try again
            </button>
          </div>
        )}

        {view.status === "success" && <WeatherResults data={view.data} />}
      </section>

      <footer className="mt-16 text-sm text-muted">
        Weather data by{" "}
        <a href="https://www.weatherapi.com/" className="underline hover:text-ink">
          WeatherAPI.com
        </a>
      </footer>
    </main>
  );
}