// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/search/route";
import { jsonResponse, slowBodyResponse, timeoutError } from "../helpers";

function call(q = "la") {
  return GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`));
}

// Shapes based on Geoapify's Autocomplete API (format=json)
const edoState = {
  result_type: "state",
  state: "Edo State",
  country: "Nigeria",
  lat: 6.6342,
  lon: 5.9304,
  place_id: "edo-state",
};
const lagosCity = {
  result_type: "city",
  city: "Lagos",
  state: "Lagos State",
  country: "Nigeria",
  lat: 6.4541,
  lon: 3.3947,
  place_id: "lagos-city",
};
const street = {
  result_type: "street",
  street: "Edo Street",
  city: "Abuja",
  country: "Nigeria",
  lat: 9.05,
  lon: 7.49,
  place_id: "street",
};

beforeEach(() => {
  vi.stubEnv("GEOAPIFY_API_KEY", "test-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/search (Geoapify)", () => {
  it('returns a state as "Edo, Nigeria" with its coordinates', async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: [edoState] })));
    const res = await call("edo");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      {
        id: "edo-state",
        name: "Edo",
        region: "",
        country: "Nigeria",
        lat: 6.6342,
        lon: 5.9304,
        kind: "state",
      },
    ]);
  });

  it("returns cities with their state as the region", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ results: [lagosCity] })));
    const [lagos] = await (await call("lagos")).json();
    expect(lagos).toMatchObject({ name: "Lagos", region: "Lagos", country: "Nigeria", kind: "city" });
  });

  it("drops streets, buildings and other non-places", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ results: [street, edoState] }))
    );
    const places = await (await call("edo")).json();
    expect(places.map((p: { name: string }) => p.name)).toEqual(["Edo"]);
  });

  it("removes duplicate places with the same label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ results: [lagosCity, { ...lagosCity, place_id: "lagos-2" }] })
      )
    );
    expect(await (await call("lagos")).json()).toHaveLength(1);
  });

  it("sends the key to Geoapify but never back to the browser", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ results: [edoState] }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await call("edo");
    expect(String(fetchMock.mock.calls[0][0])).toContain("apiKey=test-key");
    expect(JSON.stringify(await res.json())).not.toContain("test-key");
  });

  it("returns 500 when GEOAPIFY_API_KEY is missing", async () => {
    vi.stubEnv("GEOAPIFY_API_KEY", "");
    const res = await call("edo");
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns 400 for one character without calling Geoapify", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call("e")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 for malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("returns 502 when there is no results list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([lagosCity])));
    const res = await call();
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("UPSTREAM_ERROR");
  });

  it("drops entries with missing fields instead of crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ results: [null, { result_type: "city", country: "X" }, lagosCity] })
      )
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(1);
  });

  it("returns 502 when Geoapify returns an error status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ message: "Invalid apiKey" }, 401))
    );
    expect((await call()).status).toBe(502);
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