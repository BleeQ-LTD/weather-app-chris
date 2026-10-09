import { NextRequest, NextResponse } from "next/server";
import { isNumber, isRecord, isString, readJsonBody } from "@/lib/upstream";

const WEATHER_API_BASE = "https://api.weatherapi.com/v1";
const REQUEST_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

interface Place {
  id: number;
  name: string;
  region: string;
  country: string;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// Keeps only the four fields we use, and only if each has the right type
function toPlace(item: unknown): Place | null {
  if (!isRecord(item)) return null;
  const { id, name, region, country } = item;
  if (!isNumber(id) || !isString(name) || !isString(region) || !isString(country)) {
    return null;
  }
  return { id, name, region, country };
}

// GET /api/search?q=la  ->  [{ id, name, region, country }, ...]
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      "INVALID_QUERY",
      `Search text must be ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} characters.`,
      400
    );
  }

  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    console.error("[search] WEATHER_API_KEY is not set");
    return errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 500);
  }

  const url = new URL(`${WEATHER_API_BASE}/search.json`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("q", query);

  // The timeout also covers reading the body below
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Never log `url` — it contains the API key
    const reason = err instanceof Error ? err.name : "UnknownError";
    console.error(`[search] Request to WeatherAPI failed: ${reason}`);
    return errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 503);
  }

  const body = await readJsonBody(upstream);
  if (!body.ok) {
    console.error(`[search] Could not read WeatherAPI response: ${body.reason}`);
    return body.reason === "malformed"
      ? errorResponse("UPSTREAM_ERROR", "Search is not available.", 502)
      : errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 503);
  }

  if (!upstream.ok) {
    console.error(`[search] WeatherAPI error: status=${upstream.status}`);
    return errorResponse("UPSTREAM_ERROR", "Search is not available.", 502);
  }

  if (!Array.isArray(body.data)) {
    console.error("[search] WeatherAPI returned something other than a list");
    return errorResponse("UPSTREAM_ERROR", "Search is not available.", 502);
  }

  // No matches is a normal result: WeatherAPI returns an empty array
  const places = body.data.map(toPlace).filter((place): place is Place => place !== null);
  return NextResponse.json(places);
}
