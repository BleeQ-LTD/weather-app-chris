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

describe("GET /api/weather extra fields for the redesign (#71)", () => {
  const hour = (time: string, temp: number, rain: number, isDay: number) => ({
    time,
    temp_c: temp,
    chance_of_rain: rain,
    is_day: isDay,
    condition: { text: "Sunny", icon: "//cdn.weatherapi.com/s.png", code: 1000 },
  });

  it("adds hourly, UV, sunrise and the condition code when WeatherAPI sends them", async () => {
    const upstream = {
      ...validUpstream,
      current: { ...validUpstream.current, uv: 9, vis_km: 10, pressure_mb: 1010, wind_dir: "SW", is_day: 1 },
      forecast: {
        forecastday: [
          {
            ...validUpstream.forecast.forecastday[0],
            astro: { sunrise: "06:41 AM", sunset: "06:39 PM" },
            hour: [
              hour("2026-09-29 08:00", 25, 0, 1),
              hour("2026-09-29 09:00", 26, 10, 1),
              hour("2026-09-29 10:00", 27, 40, 1),
            ],
          },
        ],
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(upstream)));

    const body = await (await call()).json();

    expect(body.current).toMatchObject({ uv: 9, visibility: 10, pressure: 1010, windDirection: "SW", isDay: true, code: 1003 });
    expect(body.forecast[0]).toMatchObject({ code: 1183, sunrise: "06:41 AM", sunset: "06:39 PM" });
    // local time is 9:05, so the list starts at 9:00 (8:00 has passed)
    expect(body.hourly.map((h: { time: string }) => h.time)).toEqual(["2026-09-29 09:00", "2026-09-29 10:00"]);
    expect(body.hourly[1]).toMatchObject({ temperature: 27, chanceOfRain: 40, isDay: true, code: 1000 });
  });

  it("still works when the extra fields are missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(validUpstream)));
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hourly).toBeUndefined();
    expect(body.current.uv).toBeUndefined();
  });
});
