// Shapes returned by our own /api/weather route (not WeatherAPI's raw format)

// Fields marked optional were added for the redesign (#71). The UI hides
// whatever is missing, so older or partial responses still display.

export interface ForecastDay {
  date: string; // "2026-09-30"
  high: number;
  low: number;
  chanceOfRain: number;
  condition: string;
  icon: string;
  code?: number; // WeatherAPI condition code, e.g. 1000 = clear
  sunrise?: string; // "06:41 AM", the place's local time
  sunset?: string;
}

// One hour of the next-24-hours forecast
export interface HourForecast {
  time: string; // "2026-09-29 14:00", the place's local time
  temperature: number;
  chanceOfRain: number;
  condition: string;
  code?: number;
  isDay?: boolean;
}

export interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localTime: string; // "2026-09-29 9:05"
    timezone: string;
    lat: number | null; // null if the weather service didn't send coordinates
    lon: number | null;
  };
  current: {
    updatedAt: string; // "2026-09-29 09:00"
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    icon: string;
    code?: number;
    isDay?: boolean;
    uv?: number;
    visibility?: number; // km
    pressure?: number; // hPa (same as millibars)
    windDirection?: string; // compass point the wind comes from, e.g. "SW"
  };
  forecast: ForecastDay[];
  hourly?: HourForecast[]; // the next 24 hours, starting with the current hour
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

// 28 -> 28 (°C) or 82 (°F), rounded to a whole degree
export function convertTemp(celsius: number, unit: "C" | "F" = "C"): number {
  return Math.round(unit === "F" ? (celsius * 9) / 5 + 32 : celsius);
}

// "28°C", or "82°F" when the user prefers Fahrenheit
export function formatTemp(celsius: number, unit: "C" | "F" = "C"): string {
  return `${convertTemp(celsius, unit)}°${unit}`;
}

// "2026-09-29 15:00" -> "3 pm"; "2026-09-29 00:00" -> "12 am"
export function formatHour(localDateTime: string): string {
  const hour = Number(splitLocalDateTime(localDateTime).time.slice(0, 2));
  if (!Number.isFinite(hour)) return localDateTime;
  return `${hour % 12 || 12} ${hour < 12 ? "am" : "pm"}`;
}

// "13:42" -> "1:42 pm"
export function formatClock(time24: string): string {
  const [h, m = "00"] = time24.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return time24;
  return `${hour % 12 || 12}:${m.padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`;
}

// WeatherAPI's "06:41 AM" -> "6:41 am"
export function formatAstroTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return value;
  return `${Number(match[1])}:${match[2]} ${match[3].toLowerCase()}`;
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