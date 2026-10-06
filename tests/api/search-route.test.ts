// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";
import { jsonResponse, slowBodyResponse, timeoutError } from "../helpers";

function call(q = "la") {
  return GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`));
}

beforeEach(() => {
  vi.stubEnv("WEATHER_API_KEY", "test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/search", () => {
  it("returns only id, name, region and country", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse([
          { id: 1, name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.4, lon: 3.4, url: "x" },
        ])
      )
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 1, name: "Lagos", region: "Lagos", country: "Nigeria" },
    ]);
  });

  it("returns 502 for malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 502 when the JSON is not an array", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: [] })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("drops entries with missing fields instead of crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse([
          { name: "No id", region: "", country: "X" },
          null,
          { id: 2, name: "Abuja", region: "Federal Capital Territory", country: "Nigeria" },
        ])
      )
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 2, name: "Abuja", region: "Federal Capital Territory", country: "Nigeria" },
    ]);
  });

  it("returns 503 when reading the body times out", async () => {
    const { response, body } = slowBodyResponse();
    body.reject(timeoutError());
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    const res = await call();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });
});
