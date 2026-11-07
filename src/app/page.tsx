"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SearchForm from "@/components/SearchForm";
import WeatherResults from "@/components/WeatherResults";
import { formatPlace, matchesPlace, weatherQueryFor } from "@/lib/weather";
import type { Suggestion, WeatherData, WeatherErrorBody } from "@/lib/weather";
import { useAuth } from "@/components/AuthProvider";
import { useProfile } from "@/components/ProfileProvider";
import ProfileError from "@/components/ProfileError";
import LocationPrompt from "@/components/LocationPrompt";
import SaveFavouriteButton from "@/components/SaveFavouriteButton";
import { favouriteLabel, type Favourite } from "@/lib/favourites";
import { useFavourites } from "@/lib/useFavourites";
import type { NearbyHint } from "@/components/SearchForm";
import Greeting from "@/components/Greeting";


// Every screen the app can be on. Only one is possible at a time.
type ViewState =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "success"; data: WeatherData; fetchedAt: number }
  | { status: "not-found"; message: string }
  | {
      status: "error";
      message: string;
      query: string;
      label: string;
      place?: Suggestion;
      searchText?: string; // set when place search failed, so "Try again" re-runs the search
    };

const MIN_SEARCH_LENGTH = 2; // the search route needs at least 2 characters

function WeatherApp() {
  const [query, setQuery] = useState("");
  const favourites = useFavourites();
  // Where the user is, once they share their location (for nearby search examples)
  const [near, setNear] = useState<NearbyHint | undefined>(undefined);
  const [view, setView] = useState<ViewState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  // The last weather request, so the automatic refresh can repeat it
  const lastRequest = useRef<{ apiQuery: string; label: string; place?: Suggestion } | null>(null);

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

  // Get the weather.
  // apiQuery is what we send ("Lagos" or "6.3350,5.6037");
  // label is what the user sees while loading ("Edo, Nigeria");
  // place is the place the user picked, if any. Its name is shown instead of
  // WeatherAPI's nearest-town name, so choosing "Edo, Nigeria" shows "Edo".
  const fetchWeather = useCallback(
    async (
      apiQuery: string,
      label: string,
      controller = startRequest(),
      place?: Suggestion,
      keepCurrent = false // true for the automatic refresh: keep showing the weather while new data loads
    ) => {
      lastRequest.current = { apiQuery, label, place };
      if (!keepCurrent) setView({ status: "loading", query: label });

      try {
        const response = await fetch(
          `/api/weather?q=${encodeURIComponent(apiQuery)}`,
          { signal: controller.signal }
        );
        if (!isCurrent(controller)) return;

        const body = await response.json().catch(() => null);
        if (!isCurrent(controller)) return; // replaced while the body was arriving

        if (response.ok && body) {
          const data = body as WeatherData;
          setView({
            status: "success",
            fetchedAt: Date.now(),
            data: place
              ? {
                  ...data,
                  location: {
                    ...data.location,
                    name: place.name,
                    region: place.region,
                    country: place.country,
                    lat: place.lat,
                    lon: place.lon,
                  },
                }
              : data,
          });
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
          place,
        });
      } catch {
        if (!isCurrent(controller)) return; // replaced by a newer search
        setView({
          status: "error",
          message: "Couldn't connect. Check your internet connection and try again.",
          query: apiQuery,
          label,
          place,
        });
      }
    },
    []
  );

  // When Search is pressed: find matching places, then go straight to the best one.
  // To choose a different place, people pick from the suggestions while typing.
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
        // Don't fall back to WeatherAPI's free-text matching: it doesn't know
        // places like Edo State and guesses (e.g. "Edo, Nigeria" -> Pocatello,
        // USA). An honest error is better than weather for the wrong place.
        setView({
          status: "error",
          message: "Place search is unavailable right now. Please try again.",
          query: text,
          label: text,
          searchText: text,
        });
        return;
      }

      // The search service sometimes returns places unrelated to what was typed
      // (e.g. an airport in Turkey for "edo"), so keep only real matches
      const matching = matches.filter((place) => matchesPlace(text, place));

      if (matching.length === 0) {
        setView({
          status: "not-found",
          message: `We couldn't find "${text}". Check the spelling, or pick one of the suggestions as you type.`,
        });
        inputRef.current?.select();
        return;
      }

      const [best] = matching;
      setQuery(formatPlace(best));
      fetchWeather(weatherQueryFor(best), formatPlace(best), controller, best);
    },
    [fetchWeather]
  );

  // A place picked from the suggestions
  function choosePlace(place: Suggestion) {
    const label = formatPlace(place);
    setQuery(label);
    fetchWeather(weatherQueryFor(place), label, undefined, place);
  }

  // Every 15 minutes, quietly repeat the last request so the weather stays up to date
  // (the screen keeps showing the current weather while it loads)
  const refreshWeather = useCallback(() => {
    const last = lastRequest.current;
    if (last) fetchWeather(last.apiQuery, last.label, undefined, last.place, true);
  }, [fetchWeather]);

  // The search box's × button: cancel anything loading and go back to the start
  function clearSearch() {
    activeRequest.current?.abort();
    setQuery("");
    setView({ status: "idle" });
  }

  // Load the weather for the user's own position (from LocationPrompt).
  // We ask our server for a proper place name first (e.g. "Eti Osa, Lagos"), because
  // WeatherAPI labels coordinates with the nearest place in its own list, which can
  // be a small locality nobody recognises. If naming fails, WeatherAPI's name is used.
  // useCallback keeps it stable, so LocationPrompt doesn't re-ask on every render.
  const showMyLocation = useCallback(
    async (lat: number, lon: number) => {
      setQuery("");
      const controller = startRequest();

      let place: Suggestion | undefined;
      try {
        const response = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`, { signal: controller.signal });
        if (response.ok) place = (await response.json()) as Suggestion;
      } catch {
        // No proper name available: fall back to WeatherAPI's name below
      }
      setNear({ lat, lon, place }); // lets the search box show examples near the user

      // In the background, load towns and areas nearby to use as search examples
      fetch(`/api/nearby?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((body: { places?: string[] } | null) => {
          const places = body?.places;
          if (places && places.length > 0) {
            setNear((current) => (current ? { ...current, examples: places } : current));
          }
        })
        .catch(() => {
          // Not essential: the examples fall back to the user's own area and state
        });
      if (!isCurrent(controller)) return; // the user searched for something else meanwhile

      fetchWeather(`${lat},${lon}`, place ? formatPlace(place) : "your location", controller, place);
    },
    [fetchWeather]
  );

  // Open a saved place with the name, region and country it was saved with,
  // so the heading and search box match the favourite ("Lagos, Nigeria")
  const pickFavourite = useCallback(
    (favourite: Favourite) => {
      const label = favouriteLabel(favourite);
      setQuery(label);
      fetchWeather(`${favourite.lat},${favourite.lon}`, label, undefined, {
        id: favourite.id,
        name: favourite.name,
        region: favourite.region,
        country: favourite.country,
        lat: favourite.lat,
        lon: favourite.lon,
        kind: "city",
      });
    },
    [fetchWeather]
  );

  // Opening a favourite from the Favourites page (/?favourite=lagos_nigeria):
  // once the favourites have loaded, show that place's weather, then tidy the address bar.
  // The weather is loaded in a timer callback rather than directly in the effect,
  // so React doesn't re-render in the middle of the effect.
  const openedFavourite = useRef(false);
  useEffect(() => {
    if (openedFavourite.current || favourites.isLoading) return;
    const id = new URLSearchParams(window.location.search).get("favourite");
    if (!id) return;
    const favourite = favourites.items.find((item) => item.id === id);
    if (!favourite) return;
    openedFavourite.current = true;
    window.history.replaceState(null, "", "/");
    const timer = setTimeout(() => pickFavourite(favourite), 0);
    return () => clearTimeout(timer);
  }, [favourites.isLoading, favourites.items, pickFavourite]);

  // Short text for screen readers, announced whenever the state changes
  const announcement = {
    idle: "",
    loading: view.status === "loading" ? `Loading weather for ${view.query}` : "",
    success: view.status === "success" ? `Showing weather for ${view.data.location.name}` : "",
    "not-found": view.status === "not-found" ? view.message : "",
    error: view.status === "error" ? view.message : "",
  }[view.status];

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 sm:py-10">
      {/* The visible app name is in the top nav; this heading is for screen readers */}
      <h1 className="sr-only">Weather</h1>

      <SearchForm
        near={near}
        value={query}
        onChange={setQuery}
        onSearch={handleSearch}
        onSelectSuggestion={choosePlace}
        onClear={clearSearch}
        isLoading={view.status === "loading"}
        inputRef={inputRef}
      />

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <section className="mt-10" aria-busy={view.status === "loading"}>
        {view.status === "idle" && <LocationPrompt onLocated={showMyLocation} />}

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
              onClick={() =>
                view.searchText
                  ? handleSearch(view.searchText)
                  : fetchWeather(view.query, view.label, undefined, view.place)
              }
              className="mt-3 rounded-md border border-line bg-surface px-4 py-2 font-medium hover:border-rain"
            >
              Try again
            </button>
          </div>
        )}
        {view.status === "success" && (
          <>
            <Greeting data={view.data} />
            <WeatherResults
              data={view.data}
              fetchedAt={view.fetchedAt}
              onRefresh={refreshWeather}
              action={<SaveFavouriteButton location={view.data.location} favourites={favourites} />}
            />
          </>
        )}           
         </section>
       </main>
  );
}

// Decides what to show. A signed-in user's profile must load before the app opens.
export default function Home() {
  const authState = useAuth();
  const profileState = useProfile();

  if (authState.status === "checking") return <HomeLoading />;

  // Everyone sees the weather straight away. We only ask people to sign in
  // when an account actually helps them (saving favourites), not before.
  if (authState.status === "signed-out" || authState.status === "guest") return <WeatherApp />;

  // Signed in:
  if (profileState.status === "ready") return <WeatherApp />;
  if (profileState.status === "missing") return <GoToCompleteProfile />; // new Google user
  if (profileState.status === "error") {
    return <ProfileError reason={profileState.reason} onRetry={profileState.reload} />;
  }
  return <HomeLoading message="Loading your account…" />;
}

// Firestore confirmed there's no profile, so send them to finish it
function GoToCompleteProfile() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/complete-profile");
  }, [router]);
  return <HomeLoading message="Setting up your account…" />;
}

// Placeholder shapes, with an explanation when there is something to wait for
function HomeLoading({ message }: { message?: string }) {
  const [isSlow, setIsSlow] = useState(false);

  // If it's taking a while, say so instead of leaving people guessing
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setIsSlow(true), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:py-16" aria-busy="true">
      {message ? (
        <div role="status" className="mb-6">
          <p className="text-muted">{message}</p>
          {isSlow && (
            <p className="mt-1 text-sm text-muted">
              Still working on it. This can take a few seconds on a slow connection.
            </p>
          )}
        </div>
      ) : (
        <p className="sr-only" role="status">Loading…</p>
      )}
      <div className="h-7 w-32 rounded bg-line motion-safe:animate-pulse" />
      <div className="mt-3 h-4 w-64 rounded bg-line motion-safe:animate-pulse" />
      <div className="mt-10 h-11 w-full rounded-md bg-line motion-safe:animate-pulse" />
    </main>
  );
}