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

export interface Suggestion {
  id: number;
  name: string;
  region: string;
  country: string;
}

// "Lagos, Lagos, Nigeria" -> "Lagos, Nigeria" (skips empty or repeated parts)
export function formatPlace({ name, region, country }: Suggestion): string {
  return [name, region && region !== name ? region : null, country]
    .filter(Boolean)
    .join(", ");
}