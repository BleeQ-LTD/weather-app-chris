import { NextRequest, NextResponse } from "next/server";

const WEATHER_API_BASE = "https://api.weatherapi.com/v1";
const REQUEST_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;

// The fields we use from WeatherAPI's Search API
interface WeatherApiSearchResult {
  id: number;
  name: string;
  region: string;
  country: string;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
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

  if (!upstream.ok) {
    console.error(`[search] WeatherAPI error: status=${upstream.status}`);
    return errorResponse("UPSTREAM_ERROR", "Search is not available.", 502);
  }

  const results = (await upstream.json()) as WeatherApiSearchResult[];

  // No matches is a normal result: WeatherAPI returns an empty array
  return NextResponse.json(
    results.map(({ id, name, region, country }) => ({ id, name, region, country }))
  );
}