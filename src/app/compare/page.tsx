"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import SearchForm from "@/components/SearchForm";
import UnitToggle from "@/components/UnitToggle";
import WeatherIcon from "@/components/WeatherIcon";
import { AlertIcon, RefreshIcon } from "@/components/icons";
import { weatherKind, isDaytime } from "@/lib/conditions";
import { useTemperatureUnit } from "@/lib/units";
import { useWeatherLookup, type LookupState } from "@/lib/useWeatherLookup";
import {
  convertTemp,
  formatClock,
  formatDay,
  formatPlace,
  formatTemp,
  splitLocalDateTime,
  type Suggestion,
  type WeatherData,
} from "@/lib/weather";

// /compare: two places side by side. Each side searches and loads on its own,
// so one side loading or failing never affects the other. Nothing is saved.
//
// Layout: one table with a row per measure, so the two values are always next to
// each other. Tablet/desktop: label | place 1 | place 2. Phones: the label sits on
// its own line above the two values, so both places stay side by side at 390px
// without sideways scrolling (stacked cards would mean scrolling back and forth to compare).

type Side = {
  id: "a" | "b";
  lookup: ReturnType<typeof useWeatherLookup>;
  query: string;
  setQuery: (value: string) => void;
};

const POSITION_LABELS = ["First place", "Second place"] as const;

// Reads ?name=Lagos&region=Lagos&country=Nigeria&lat=6.45&lon=3.39 (the main page's "Compare" link)
function placeFromUrl(): Suggestion | null {
  const params = new URLSearchParams(window.location.search);
  const name = params.get("name");
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!name || !params.has("lat") || !params.has("lon") || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { id: "from-link", name, region: params.get("region") ?? "", country: params.get("country") ?? "", lat, lon, kind: "city" };
}

export default function ComparePage() {
  const a = useWeatherLookup();
  const b = useWeatherLookup();
  const [queryA, setQueryA] = useState("");
  const [queryB, setQueryB] = useState("");
  const [swapped, setSwapped] = useState(false);
  const unit = useTemperatureUnit();

  // Coming from "Compare" on the main page: start with that place on the left.
  // Everything happens in the timer callback, so React doesn't re-render in the middle
  // of the effect, and if React runs the effect twice (development), the first run's
  // timer is cancelled and the second one does the work.
  const chooseA = a.choose;
  useEffect(() => {
    const timer = setTimeout(() => {
      const place = placeFromUrl();
      if (!place) return;
      window.history.replaceState(null, "", "/compare"); // tidy the address bar
      setQueryA(formatPlace(place));
      chooseA(place);
    }, 0);
    return () => clearTimeout(timer);
  }, [chooseA]);

  const sideA: Side = { id: "a", lookup: a, query: queryA, setQuery: setQueryA };
  const sideB: Side = { id: "b", lookup: b, query: queryB, setQuery: setQueryB };
  const sides = swapped ? [sideB, sideA] : [sideA, sideB];
  const temp = (celsius: number) => formatTemp(celsius, unit);
  const bothEmpty = a.state.status === "idle" && b.state.status === "idle";

  // Row labels for the forecast days come from whichever side has data
  const loaded = sides.map((side) => (side.lookup.state.status === "success" ? side.lookup.state.data : null));
  const someData = loaded.find(Boolean) ?? null;
  const dayCount = Math.max(0, ...loaded.map((data) => data?.forecast.length ?? 0));

  const rows: { label: string; render: (data: WeatherData) => ReactNode }[] = [
    {
      label: "Now",
      render: (data) => (
        <span className="flex items-center gap-2">
          <WeatherIcon
            kind={weatherKind(data.current.code, data.current.condition)}
            isDay={isDaytime(data.current.isDay, data.location.localTime)}
            size={36}
            className="shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-2xl leading-tight font-semibold sm:text-3xl">
              {convertTemp(data.current.temperature, unit)}°{unit}
            </span>
            <span className="block text-sm text-muted">{data.current.condition}</span>
          </span>
        </span>
      ),
    },
    { label: "Feels like", render: (data) => temp(data.current.feelsLike) },
    { label: "Humidity", render: (data) => `${data.current.humidity}${data.units.humidity}` },
    { label: "Wind", render: (data) => `${Math.round(data.current.windSpeed)} ${data.units.windSpeed}` },
    {
      label: "Chance of rain today",
      render: (data) => (data.forecast[0] ? `${data.forecast[0].chanceOfRain}${data.units.chanceOfRain}` : "—"),
    },
    ...Array.from({ length: dayCount }, (_, index) => ({
      label:
        index === 0 ? "Today" : index === 1 ? "Tomorrow" : someData?.forecast[index] ? formatDay(someData.forecast[index].date) : `Day ${index + 1}`,
      render: (data: WeatherData) => {
        const day = data.forecast[index];
        if (!day) return "—";
        return (
          <span className="flex items-center gap-2">
            <WeatherIcon kind={weatherKind(day.code, day.condition)} size={28} className="shrink-0" />
            <span>
              <span className="sr-only">Low </span>
              <span className="text-muted">{temp(day.low)}</span>
              <span aria-hidden="true" className="text-muted"> – </span>
              <span className="sr-only">, high </span>
              <span className="font-semibold">{temp(day.high)}</span>
            </span>
          </span>
        );
      },
    })),
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-2 pb-10 sm:px-8 sm:pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare</h1>
          <p className="text-muted">See the weather in two places side by side.</p>
        </div>
        <UnitToggle />
      </div>

      {/* The two search boxes, with Swap between them */}
      <div className="mt-5 grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3">
        {sides.map((side, index) => (
          <SideSearch key={side.id} side={side} label={POSITION_LABELS[index]} order={index} />
        ))}
        <button
          type="button"
          onClick={() => setSwapped((value) => !value)}
          disabled={bothEmpty}
          aria-label="Swap the two places"
          className="order-1 flex h-11 w-11 items-center justify-center self-center justify-self-center rounded-full border border-line bg-surface text-link hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50 sm:mt-1"
        >
          {/* Up/down arrows on phones (boxes stacked), left/right on wider screens */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="rotate-90 sm:rotate-0">
            <path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
          </svg>
        </button>
      </div>

      {/* The comparison: one row per measure, the two places always side by side */}
      <div role="table" aria-label="Weather comparison" className="mt-5 overflow-hidden rounded-3xl bg-surface">
        <div role="row" className="grid grid-cols-2 gap-x-3 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] sm:px-6">
          <span role="cell" className="hidden sm:block" />
          {sides.map((side, index) => (
            <div role="columnheader" key={side.id} className="min-w-0">
              <span className="sr-only">{POSITION_LABELS[index]}: </span>
              <SideHeader state={side.lookup.state} onRetry={side.lookup.retry} />
            </div>
          ))}
        </div>

        {rows.map((row) => (
          <div
            role="row"
            key={row.label}
            className="grid grid-cols-2 items-center gap-x-3 border-t border-line px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] sm:px-6"
          >
            <span role="rowheader" className="col-span-2 mb-1.5 text-[13px] font-medium text-muted sm:col-span-1 sm:mb-0 sm:text-sm">
              {row.label}
            </span>
            {loaded.map((data, index) => (
              <span role="cell" key={sides[index].id} className="min-w-0 text-[17px] font-medium">
                {data ? (
                  row.render(data)
                ) : (
                  <>
                    <span aria-hidden="true" className="text-muted">—</span>
                    <span className="sr-only">No data</span>
                  </>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

// One side's search box. Order keeps them first and last, with Swap in between.
function SideSearch({ side, label, order }: { side: Side; label: string; order: number }) {
  const { lookup } = side;
  // Each box owns its input ref, so it moves with the box when the places are swapped
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={order === 0 ? "order-0" : "order-2"}>
      <p className="mb-1.5 px-1 text-sm font-medium text-muted" aria-hidden="true">
        {label}
      </p>
      <SearchForm
        label={label}
        value={side.query}
        onChange={side.setQuery}
        onSearch={lookup.search}
        onSelectSuggestion={lookup.choose}
        onClear={() => {
          side.setQuery("");
          lookup.clear();
        }}
        isLoading={lookup.state.status === "loading"}
        inputRef={inputRef}
      />
    </div>
  );
}

// The top of each column: the place, or what's happening on that side
function SideHeader({ state, onRetry }: { state: LookupState; onRetry: () => void }) {
  if (state.status === "idle") {
    return <p className="text-muted">Pick a place above</p>;
  }
  if (state.status === "loading") {
    return (
      <p role="status" className="flex items-center gap-2 text-muted">
        <span aria-hidden="true" className="h-4 w-4 shrink-0 rounded-full border-2 border-line border-t-rain motion-safe:animate-spin" />
        <span className="min-w-0 truncate">Loading {state.label}…</span>
      </p>
    );
  }
  if (state.status === "not-found" || state.status === "error") {
    return (
      <div role="alert" className="text-sm">
        <p className="flex items-start gap-1.5 font-medium text-alert">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          {state.status === "not-found" ? "Place not found" : "Weather unavailable"}
        </p>
        <p className="mt-0.5 text-muted">{state.message}</p>
        {state.status === "error" && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 flex h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-link px-3 font-semibold text-link hover:bg-accent-soft"
          >
            <RefreshIcon size={16} />
            Try again
          </button>
        )}
      </div>
    );
  }
  const { location } = state.data;
  const rest = [location.region, location.country].filter((part) => part && part !== location.name).join(", ");
  const local = splitLocalDateTime(location.localTime);
  return (
    <div className="min-w-0">
      <p className="truncate text-lg font-bold sm:text-xl">{location.name}</p>
      {rest && <p className="truncate text-sm text-muted">{rest}</p>}
      <p className="text-sm text-muted">
        <span className="sr-only">Local time </span>
        {formatDay(local.date)}, {formatClock(local.time)}
      </p>
    </div>
  );
}
