import { NextRequest, NextResponse } from "next/server";
import type { Suggestion } from "@/lib/weather";
import { isNumber, isRecord, isString, readJsonBody } from "@/lib/upstream";

// GET /api/reverse?lat=6.43&lon=3.47  ->  { id, name, region, country, lat, lon, kind }
//
// Turns the user's coordinates into the city people recognise ("Lagos", with "Eti Osa"
// underneath). WeatherAPI labels coordinates with the nearest place in its own list,
// which can be a small locality nobody recognises ("Mobba"), so we ask Geoapify
// (OpenStreetMap data) for the city level instead. For weather, the city is what matters.
const GEOAPIFY_REVERSE = "https://api.geoapify.com/v1/geocode/reverse";
const REQUEST_TIMEOUT_MS = 5000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

// "Lagos State" -> "Lagos"
function stripStateSuffix(name: string) {
  return name.replace(/\s+State$/i, "").trim();
}

// Shows the city as the main name (e.g. "Lagos"), with the local area underneath
// (e.g. "Eti Osa"). If the map has no city for this spot, falls back to the local
// area, then the state.
function toPlace(item: unknown, lat: number, lon: number): Suggestion | null {
  if (!isRecord(item)) return null;
  const { city, county, state, country, place_id } = item;
  if (!isString(country)) return null;

  const cityName = isString(city) ? city : "";
  const countyName = isString(county) ? county : ""; // in Nigeria, the local government area
  const stateName = isString(state) ? stripStateSuffix(state) : "";

  // Main name: the city; if there is none here, the local area, then the state
  const name = cityName || countyName || stateName;
  if (!name) return null;

  // Underneath: the local area and the state, without repeating the main name
  const biggerAreas = [countyName, stateName].filter(
    (part, index, all) => part && part !== name && all.indexOf(part) === index
  );

  return {
    id: isString(place_id) ? place_id : `${lat},${lon}`,
    name,
    region: biggerAreas.join(", "),
    country,
    lat,
    lon,
    kind: "city",
  };
}

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));

  if (!isNumber(lat) || !isNumber(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return errorResponse("INVALID_COORDINATES", "Those coordinates don't look right.", 400);
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) {
    console.error("[reverse] GEOAPIFY_API_KEY is not set");
    return errorResponse("SERVER_MISCONFIGURED", "Place names aren't available right now.", 500);
  }

  const url = new URL(GEOAPIFY_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "en");
  url.searchParams.set("type", "city"); // ask for the city these coordinates are in, not the nearest locality
  url.searchParams.set("apiKey", apiKey);

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    console.error("[reverse] Could not reach Geoapify:", error);
    return errorResponse("SERVICE_UNAVAILABLE", "Place names aren't available right now.", 503);
  }

  if (!upstream.ok) {
    console.error("[reverse] Geoapify responded with", upstream.status);
    return errorResponse("SERVICE_UNAVAILABLE", "Place names aren't available right now.", 503);
  }

  const body = await readJsonBody(upstream);
  if (!body.ok || !isRecord(body.data) || !Array.isArray(body.data.results)) {
    console.error("[reverse] Unexpected response from Geoapify");
    return errorResponse("SERVICE_UNAVAILABLE", "Place names aren't available right now.", 503);
  }


  const place = toPlace(body.data.results[0], lat, lon);
  if (!place) {
    return errorResponse("NOT_FOUND", "We couldn't name this place.", 404);
  }

  return NextResponse.json(place);
}