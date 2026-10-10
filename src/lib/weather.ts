// Shapes returned by our own /api/weather route (not WeatherAPI's raw format)

export interface ForecastDay {
  date: string; // "2026-09-30"
  high: number;
  low: number;
  chanceOfRain: number;
  condition: string;
  icon: string;
}

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localTime: string; // "2026-09-29 9:05"
    timezone: string;
  };
  current: {
    updatedAt: string; // "2026-09-29 09:00"
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    icon: string;
  };
  forecast: ForecastDay[];
  units: {
    temperature: string;
    windSpeed: string;
    humidity: string;
    chanceOfRain: string;
  };
}

export type WeatherErrorCode =
  | "MISSING_LOCATION"
  | "LOCATION_NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "UPSTREAM_ERROR";

export interface WeatherErrorBody {
  error: { code: WeatherErrorCode; message: string };
}

// ---- Formatting helpers ----

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// "2026-09-30" -> "Wed 30 Sep".
// Built and formatted in UTC on purpose: new Date("2026-09-30") in a
// timezone behind UTC would show the previous day.
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return dayFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

// "2026-09-29 9:05" -> { date: "2026-09-29", time: "09:05" }
// WeatherAPI sometimes omits the leading zero on the hour.
export function splitLocalDateTime(value: string) {
  const [date, time = ""] = value.split(" ");
  return { date, time: time.padStart(5, "0") };
}

export function formatTemp(celsius: number): string {
  return `${Math.round(celsius)}°C`;
}

// ---- Search suggestions (from /api/search) ----

export type PlaceKind = "city" | "area" | "state" | "country";

export interface Suggestion {
  id: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  kind: PlaceKind;
}

// What we send to /api/weather for a chosen place. Coordinates, because the
// search provider (Geoapify) and the weather provider (WeatherAPI) use
// different place IDs. WeatherAPI accepts "lat,lon" directly.
export function weatherQueryFor(place: Suggestion): string {
  return `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
}

// Short word shown next to non-city results, e.g. "Edo, Nigeria · State"
export function kindLabel(kind: PlaceKind): string {
  return { city: "", area: "Area", state: "State", country: "Country" }[kind];
}

// Does what the user typed actually appear in this place's name, region or
// country? "edo" does not match "Balikesir Koca Seyit Airport, Edremit, Turkey",
// but "lagos nigeria" matches "Lagos, Nigeria". Ignores case and accents.
export function matchesPlace(text: string, place: Suggestion): boolean {
  const normalise = (value: string) =>
    value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const haystack = normalise(`${place.name} ${place.region} ${place.country}`);
  const words = normalise(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

// "Lagos, Lagos, Nigeria" -> "Lagos, Nigeria" (skips empty or repeated parts)
export function formatPlace({ name, region, country }: Suggestion): string {
  return [name, region && region !== name ? region : null, country]
    .filter(Boolean)
    .join(", ");
}