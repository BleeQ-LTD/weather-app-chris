import { NextRequest, NextResponse } from "next/server";
import { isRecord, isString, readJsonBody } from "@/lib/upstream";

// GET /api/nearby?lat=6.46&lon=3.48  ->  { places: ["Ikeja, Lagos", "Lekki, Lagos", ...] }
//
// Names of towns and areas near the user, used as examples in the empty search box
// ("Try 'Ikeja, Lagos'"). Uses Geoapify's Places API (OpenStreetMap data).
// Only called after the user has shared their location.
const GEOAPIFY_PLACES = "https://api.geoapify.com/v2/places";
const REQUEST_TIMEOUT_MS = 5000;
const RADIUS_METRES = 30_000; // about 30 km around the user
const UPSTREAM_LIMIT = 20; // ask for more than we show, because some get filtered out
const MAX_PLACES = 8;
const CATEGORIES = [
  "populated_place.city",
  "populated_place.town",
  "populated_place.suburb",
].join(",");

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// "Lagos State" -> "Lagos"
function stripStateSuffix(name: string) {
  return name.replace(/\s+State$/i, "").trim();
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  if (
    !params.has("lat") ||
    !params.has("lon") ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  ) {
    return errorResponse("INVALID_COORDINATES", "Those coordinates don't look right.", 400);
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.error("[nearby] GEOAPIFY_API_KEY is not set");
    return errorResponse("SERVER_MISCONFIGURED", "Nearby places aren't available right now.", 500);
  }

  const url = new URL(GEOAPIFY_PLACES);
  url.searchParams.set("categories", CATEGORIES);
  url.searchParams.set("filter", `circle:${lon},${lat},${RADIUS_METRES}`); // longitude first
  url.searchParams.set("bias", `proximity:${lon},${lat}`); // nearest first
  url.searchParams.set("limit", String(UPSTREAM_LIMIT));
  url.searchParams.set("lang", "en");
  url.searchParams.set("apiKey", apiKey);

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    // Never log `url`: it contains the API key
    console.error("[nearby] Could not reach Geoapify:", error instanceof Error ? error.name : error);
    return errorResponse("SERVICE_UNAVAILABLE", "Nearby places aren't available right now.", 503);
  }

  if (!upstream.ok) {
    console.error("[nearby] Geoapify responded with", upstream.status);
    return errorResponse("SERVICE_UNAVAILABLE", "Nearby places aren't available right now.", 503);
  }

  const body = await readJsonBody(upstream);
  const features = body.ok && isRecord(body.data) ? body.data.features : undefined;
  if (!Array.isArray(features)) {
    console.error("[nearby] Unexpected response from Geoapify");
    return errorResponse("SERVICE_UNAVAILABLE", "Nearby places aren't available right now.", 503);
  }

  // "Ikeja, Lagos": the place name plus its state, without repeats
  const seen = new Set<string>();
  const places: string[] = [];
  for (const feature of features) {
    const properties = isRecord(feature) ? feature.properties : undefined;
    if (!isRecord(properties) || !isString(properties.name)) continue;

    const name = properties.name.trim();
    const state = isString(properties.state) ? stripStateSuffix(properties.state) : "";
    const label = state && state !== name ? `${name}, ${state}` : name;

    const key = label.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    places.push(label);
    if (places.length === MAX_PLACES) break;
  }

  return NextResponse.json({ places });
}