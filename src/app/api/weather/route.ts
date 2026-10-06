import { NextRequest, NextResponse } from "next/server";
import { isNumber, isRecord, isString, readJsonBody } from "@/lib/upstream";

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

// ---- Checking the parts of WeatherAPI's response we actually use ----

interface Condition {
  text: string;
  icon: string;
}

// Returns the condition's text and icon, or null if either is missing
function parseCondition(value: unknown): Condition | null {
  if (!isRecord(value) || !isString(value.text) || !isString(value.icon)) return null;
  return { text: value.text, icon: value.icon };
}

// Checks every field we use, then builds our own response shape.
// Returns null if anything is missing or the wrong type.
function parseForecast(data: unknown) {
  if (!isRecord(data)) return null;
  const { location, current, forecast } = data;

  if (
    !isRecord(location) ||
    !isString(location.name) ||
    !isString(location.region) ||
    !isString(location.country) ||
    !isString(location.localtime) ||
    !isString(location.tz_id)
  ) {
    return null;
  }

  const currentCondition = isRecord(current) ? parseCondition(current.condition) : null;
  if (
    !isRecord(current) ||
    !currentCondition ||
    !isString(current.last_updated) ||
    !isNumber(current.temp_c) ||
    !isNumber(current.feelslike_c) ||
    !isNumber(current.humidity) ||
    !isNumber(current.wind_kph)
  ) {
    return null;
  }

  if (!isRecord(forecast) || !Array.isArray(forecast.forecastday)) return null;

  const days = [];
  for (const entry of forecast.forecastday) {
    const day = isRecord(entry) && isRecord(entry.day) ? entry.day : null;
    const condition = day ? parseCondition(day.condition) : null;
    if (
      !isRecord(entry) ||
      !day ||
      !condition ||
      !isString(entry.date) ||
      !isNumber(day.maxtemp_c) ||
      !isNumber(day.mintemp_c) ||
      !isNumber(day.daily_chance_of_rain)
    ) {
      return null;
    }
    days.push({
      date: entry.date,
      high: day.maxtemp_c,
      low: day.mintemp_c,
      chanceOfRain: day.daily_chance_of_rain,
      condition: condition.text,
      icon: toHttps(condition.icon),
    });
  }

  return {
    location: {
      name: location.name,
      region: location.region,
      country: location.country,
      localTime: location.localtime,
      timezone: location.tz_id,
    },
    current: {
      updatedAt: current.last_updated,
      temperature: current.temp_c,
      feelsLike: current.feelslike_c,
      humidity: current.humidity,
      windSpeed: current.wind_kph,
      condition: currentCondition.text,
      icon: toHttps(currentCondition.icon),
    },
    forecast: days,
    units: {
      temperature: "°C",
      windSpeed: "km/h",
      humidity: "%",
      chanceOfRain: "%",
    },
  };
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
    // Never log `url` â€” it contains the API key
    const reason = err instanceof Error ? err.name : "UnknownError";
    console.error(`[weather] Request to WeatherAPI failed: ${reason}`);
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      "Couldn't reach the weather service. Check your connection and try again.",
      503
    );
  }

  // 4. Read the body safely: it may be cut off, not JSON, or the wrong shape
  const body = await readJsonBody(upstream);
  if (!body.ok) {
    console.error(`[weather] Could not read WeatherAPI response: ${body.reason}`);
    return body.reason === "malformed"
      ? errorResponse(
          "UPSTREAM_ERROR",
          "The weather service had a problem. Please try again shortly.",
          502
        )
      : errorResponse(
          "SERVICE_UNAVAILABLE",
          "Couldn't reach the weather service. Check your connection and try again.",
          503
        );
  }

  // 5. Translate WeatherAPI errors into our own error codes
  if (!upstream.ok) {
    const upstreamError = isRecord(body.data) && isRecord(body.data.error) ? body.data.error : null;
    const upstreamCode = upstreamError && isNumber(upstreamError.code) ? upstreamError.code : undefined;

    if (upstreamCode === WEATHERAPI_LOCATION_NOT_FOUND) {
      return errorResponse(
        "LOCATION_NOT_FOUND",
        `We couldn't find "${query}". Check the spelling or try a nearby city.`,
        404
      );
    }

    // Key problems, quota exceeded, WeatherAPI outages: log details, show a generic message
    console.error(
      `[weather] WeatherAPI error: status=${upstream.status} code=${upstreamCode}`
    );
    return errorResponse(
      "UPSTREAM_ERROR",
      "The weather service had a problem. Please try again shortly.",
      502
    );
  }

  // 6. Check the shape and reshape into our own clean format for the UI
  const result = parseForecast(body.data);
  if (!result) {
    console.error("[weather] WeatherAPI response was missing expected fields");
    return errorResponse(
      "UPSTREAM_ERROR",
      "The weather service had a problem. Please try again shortly.",
      502
    );
  }

  return NextResponse.json(result);
}
