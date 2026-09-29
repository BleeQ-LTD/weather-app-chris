import { NextRequest, NextResponse } from "next/server";

const WEATHER_API_BASE = "https://api.weatherapi.com/v1";
const FORECAST_DAYS = 3;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_QUERY_LENGTH = 100;

// WeatherAPI's error code for "No matching location found"
const WEATHERAPI_LOCATION_NOT_FOUND = 1006;

// ---- Our own error contract (what the UI receives) ----

type ErrorCode =
  | "MISSING_LOCATION"
  | "LOCATION_NOT_FOUND"
  | "SERVICE_UNAVAILABLE"
  | "UPSTREAM_ERROR";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// ---- The parts of WeatherAPI's response we actually use ----

interface WeatherApiCondition {
  text: string;
  icon: string;
  code: number;
}

interface WeatherApiResponse {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
    tz_id: string;
  };
  current: {
    last_updated: string;
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    condition: WeatherApiCondition;
  };
  forecast: {
    forecastday: {
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        daily_chance_of_rain: number;
        condition: WeatherApiCondition;
      };
    }[];
  };
}

interface WeatherApiError {
  error?: { code?: number; message?: string };
}

// WeatherAPI returns icon URLs like "//cdn.weatherapi.com/..." with no protocol
function toHttps(iconUrl: string) {
  return iconUrl.startsWith("//") ? `https:${iconUrl}` : iconUrl;
}

// ---- GET /api/weather?q=Lagos ----

export async function GET(request: NextRequest) {
  // 1. Validate input before spending an API call
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return errorResponse("MISSING_LOCATION", "Please enter a location.", 400);
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      "MISSING_LOCATION",
      "That location name is too long. Please shorten it.",
      400
    );
  }

  // 2. Read the key on the server only (no NEXT_PUBLIC_ prefix)
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.error("[weather] WEATHER_API_KEY is not set");
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "The weather service is not configured.",
      500
    );
  }

  const url = new URL(`${WEATHER_API_BASE}/forecast.json`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);
  url.searchParams.set("days", String(FORECAST_DAYS));
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");

  // 3. Call WeatherAPI, handling network failures and timeouts
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Never log `url` — it contains the API key
    const reason = err instanceof Error ? err.name : "UnknownError";
    console.error(`[weather] Request to WeatherAPI failed: ${reason}`);
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Couldn't reach the weather service. Check your connection and try again.",
      503
    );
  }

  // 4. Translate WeatherAPI errors into our own error codes
  if (!upstream.ok) {
    const body = (await upstream.json().catch(() => null)) as WeatherApiError | null;
    const upstreamCode = body?.error?.code;

    if (upstreamCode === WEATHERAPI_LOCATION_NOT_FOUND) {
      return errorResponse(
        "LOCATION_NOT_FOUND",
        `We couldn't find "${query}". Check the spelling or try a nearby city.`,
        404
      );
    }

    // Key problems, quota exceeded, WeatherAPI outages: log details, show a generic message
    console.error(
      `[weather] WeatherAPI error: status=${upstream.status} code=${upstreamCode} message=${body?.error?.message}`
    );
    return errorResponse(
      "UPSTREAM_ERROR",
      "The weather service had a problem. Please try again shortly.",
      502
    );
  }

  // 5. Reshape into our own clean format for the UI
  const data = (await upstream.json()) as WeatherApiResponse;

  return NextResponse.json({
    location: {
      name: data.location.name,
      region: data.location.region,
      country: data.location.country,
      localTime: data.location.localtime,
      timezone: data.location.tz_id,
    },
    current: {
      updatedAt: data.current.last_updated,
      temperature: data.current.temp_c,
      feelsLike: data.current.feelslike_c,
      humidity: data.current.humidity,
      windSpeed: data.current.wind_kph,
      condition: data.current.condition.text,
      icon: toHttps(data.current.condition.icon),
    },
    forecast: data.forecast.forecastday.map((day) => ({
      date: day.date,
      high: day.day.maxtemp_c,
      low: day.day.mintemp_c,
      chanceOfRain: day.day.daily_chance_of_rain,
      condition: day.day.condition.text,
      icon: toHttps(day.day.condition.icon),
    })),
    units: {
      temperature: "°C",
      windSpeed: "km/h",
      humidity: "%",
      chanceOfRain: "%",
    },
  });
}