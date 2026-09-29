"use client";

import { useCallback, useRef, useState } from "react";
import SearchForm from "@/components/SearchForm";
import WeatherResults from "@/components/WeatherResults";
import type { WeatherData, WeatherErrorBody } from "@/lib/weather";

// Every screen the app can be on. Only one is possible at a time.
type ViewState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "success"; data: WeatherData }
  | { status: "not-found"; message: string }
  | { status: "error"; message: string; query: string };

const QUICK_PICKS = ["Lagos", "Abuja", "Accra", "London"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const search = useCallback(async (location: string) => {
    // Cancel any search still in flight so an older, slower response
    // can't overwrite the newer one
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setView({ status: "loading", query: location });

    try {
      const response = await fetch(
        `/api/weather?q=${encodeURIComponent(location)}`,
        { signal: controller.signal }
      );
      const body = await response.json().catch(() => null);

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
        query: location,
      });
    } catch {
      if (controller.signal.aborted) return; // replaced by a newer search
      setView({
        status: "error",
        message: "Couldn't connect. Check your internet connection and try again.",
        query: location,
      });
    }
  }, []);

  function pickCity(city: string) {
    setQuery(city);
    search(city);
  }

  // Short text for screen readers, announced whenever the state changes
  const announcement = {
    idle: "",
    loading: view.status === "loading" ? `Loading weather for ${view.query}` : "",
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
        onSearch={search}
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
              onClick={() => search(view.query)}
              className="mt-3 rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-rain"
            >
              Try again
            </button>
          </div>
        )}

        {view.status === "success" && <WeatherResults data={view.data} />}
      </section>
    </main>
  );
}