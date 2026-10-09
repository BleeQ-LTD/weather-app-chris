// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/weather/route";
import { jsonResponse, slowBodyResponse, timeoutError } from "../helpers";

const validUpstream = {
  location: {
    name: "Lagos",
    region: "Lagos",
    country: "Nigeria",
    localtime: "2026-09-29 9:05",
    tz_id: "Africa/Lagos",
  },
  current: {
    last_updated: "2026-09-29 09:00",
    temp_c: 27.4,
    feelslike_c: 30.1,
    humidity: 80,
    wind_kph: 12.2,
    condition: { text: "Partly cloudy", icon: "//cdn.weatherapi.com/c.png", code: 1003 },
  },
  forecast: {
    forecastday: [
      {
        date: "2026-09-29",
        day: {
          maxtemp_c: 30,
          mintemp_c: 24,
          daily_chance_of_rain: 60,
          condition: { text: "Light rain", icon: "//cdn.weatherapi.com/r.png", code: 1183 },
        },
      },
    ],
  },
};

function call(q = "Lagos") {
  return GET(new NextRequest(`http://localhost/api/weather?q=${encodeURIComponent(q)}`));
}

beforeEach(() => {
  vi.stubEnv("WEATHER_API_KEY", "test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/weather", () => {
  it("maps a valid response and adds https to icons", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(validUpstream)));
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.location.name).toBe("Lagos");
    expect(body.current.temperature).toBe(27.4);
    expect(body.current.icon).toBe("https://cdn.weatherapi.com/c.png");
    expect(body.forecast[0].icon).toBe("https://cdn.weatherapi.com/r.png");
    expect(body.forecast[0].chanceOfRain).toBe(60);
  });

  it("returns 502 for a malformed JSON body with status 200", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>oops", { status: 200 })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 502 for valid JSON that is missing required fields", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ location: { name: "Lagos" } })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 503 when reading the body times out", async () => {
    const { response, body } = slowBodyResponse();
    body.reject(timeoutError());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const res = await call();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 502 for a malformed error body with status 400", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not json", { status: 400 })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("maps WeatherAPI error 1006 to 404 LOCATION_NOT_FOUND", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: 1006, message: "No matching location found." } }, 400)
      )
    );
    const res = await call("zzzz");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("LOCATION_NOT_FOUND");
  });
});
