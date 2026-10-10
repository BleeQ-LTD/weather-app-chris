import { NextRequest, NextResponse } from "next/server";
import type { PlaceKind, Suggestion } from "@/lib/weather";
import { isNumber, isRecord, isString, readJsonBody } from "@/lib/upstream";

// Place search uses Geoapify (OpenStreetMap data), not WeatherAPI.
// WeatherAPI's own search only knows cities and towns, so states such as
// "Edo, Nigeria" never appeared. Geoapify also returns states and districts.
const GEOAPIFY_AUTOCOMPLETE = "https://api.geoapify.com/v1/geocode/autocomplete";
const REQUEST_TIMEOUT_MS = 5000;
const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 100;
const UPSTREAM_LIMIT = 10; // ask for more than we show, because some get filtered out
const MAX_RESULTS = 6;

// Geoapify result types we treat as "places you can get weather for".
// Streets, buildings, businesses and postcodes are dropped.
const KIND_BY_RESULT_TYPE: Record<string, PlaceKind> = {
  city: "city",
  suburb: "area",
  district: "area",
  county: "area",
  state: "state",
  country: "country",
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// "Edo State" -> "Edo", so states read like "Edo, Nigeria" (as cities do)
function stripStateSuffix(name: string) {
  return name.replace(/\s+State$/i, "").trim();
}

// Turns one Geoapify result into our Suggestion shape, or null if it isn't a
// place we can show (wrong type, or missing fields).
function toSuggestion(item: unknown): Suggestion | null {
  if (!isRecord(item)) return null;
  const { result_type, lat, lon, country, state, city, county, name, place_id } = item;

  if (!isString(result_type) || !isNumber(lat) || !isNumber(lon) || !isString(country)) {
    return null;
  }
  const kind = KIND_BY_RESULT_TYPE[result_type];
  if (!kind) return null;

  const stateName = isString(state) ? stripStateSuffix(state) : "";
  let placeName = "";
  let region = "";

  if (kind === "state") {
    placeName = stateName;
  } else if (kind === "country") {
    placeName = country;
  } else if (kind === "city") {
    placeName = isString(city) ? city : isString(name) ? name : "";
    region = stateName;
  } else {
    placeName = isString(name) ? name : isString(county) ? county : "";
    region = stateName;
  }
  if (!placeName) return null;

  return {
    id: isString(place_id) ? place_id : `${lat},${lon}`,
    name: placeName,
    region: kind === "country" ? "" : region,
    country: kind === "country" ? "" : country,
    lat,
    lon,
    kind,
  };
}

// Same label and kind = same place for the user, so show it once
// (e.g. "Lagos Island, Lagos, Nigeria" appearing twice).
function dedupe(places: Suggestion[]) {
  const seen = new Set<string>();
  return places.filter((place) => {
    const key = `${place.kind}|${place.name}|${place.region}|${place.country}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// GET /api/search?q=edo  ->  [{ id, name, region, country, lat, lon, kind }, ...]
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < MIN_QUERY_LENGTH || query.length > MAX_QUERY_LENGTH) {
    return errorResponse(
      "INVALID_QUERY",
      `Search text must be ${MIN_QUERY_LENGTH}-${MAX_QUERY_LENGTH} characters.`,
      400
    );
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.error("[search] GEOAPIFY_API_KEY is not set");
    return errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 500);
  }

  const url = new URL(GEOAPIFY_AUTOCOMPLETE);
  url.searchParams.set("text", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "en");
  url.searchParams.set("limit", String(UPSTREAM_LIMIT));
  url.searchParams.set("apiKey", apiKey);

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
    console.error(`[search] Request to Geoapify failed: ${reason}`);
    return errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 503);
  }

  const body = await readJsonBody(upstream);
  if (!body.ok) {
    console.error(`[search] Could not read Geoapify response: ${body.reason}`);
    return body.reason === "malformed"
      ? errorResponse("UPSTREAM_ERROR", "Search is not available.", 502)
      : errorResponse("SERVICE_UNAVAILABLE", "Search is not available.", 503);
  }

  if (!upstream.ok) {
    console.error(`[search] Geoapify error: status=${upstream.status}`);
    return errorResponse("UPSTREAM_ERROR", "Search is not available.", 502);
  }

  const results = isRecord(body.data) ? body.data.results : undefined;
  if (!Array.isArray(results)) {
    console.error("[search] Geoapify response had no results list");
    return errorResponse("UPSTREAM_ERROR", "Search is not available.", 502);
  }

  // No matches is a normal result: an empty list
  const places = dedupe(
    results.map(toSuggestion).filter((place): place is Suggestion => place !== null)
  ).slice(0, MAX_RESULTS);

  return NextResponse.json(places);
}