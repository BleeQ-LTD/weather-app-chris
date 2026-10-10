import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import type { Suggestion } from "@/lib/weather";
import { jsonResponse } from "../helpers";

const airport: Suggestion = {
  id: "9005631",
  name: "Balikesir Koca Seyit Airport",
  region: "Edremit",
  country: "Turkey",
  lat: 39.5546,
  lon: 27.0138,
  kind: "area",
};

function resultsSection(container: HTMLElement) {
  return within(container.querySelector("section") as HTMLElement);
}

describe("Home page with a single, unrelated match", () => {
  it('asks "did you mean" instead of loading the weather for "edo"', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([airport]));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.type(screen.getByRole("combobox"), "edo");
    await user.click(screen.getByRole("button", { name: "Search" }));

    const section = resultsSection(container);
    expect(await section.findByText(/No exact match for/)).toBeInTheDocument();
    expect(
      section.getByRole("button", { name: /Balikesir Koca Seyit Airport/ })
    ).toBeInTheDocument();
    const weatherCalls = fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/weather"));
    expect(weatherCalls).toHaveLength(0);
  });

  it("loads the weather straight away when the single match is what was typed", async () => {
    const lagos: Suggestion = { id: "1", name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.4541, lon: 3.3947, kind: "city" };
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([lagos]));
      return new Promise<Response>(() => {}); // weather never answers
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.type(screen.getByRole("combobox"), "Lagos");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await resultsSection(container).findByText(/Loading weather for Lagos, Nigeria/);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/weather?q=6.4541%2C3.3947")).toBe(true);
  });
});

describe("Choosing a state such as Edo", () => {
  it('fetches weather by coordinates and shows "Edo, Nigeria", not the nearest town', async () => {
    const edo: Suggestion = {
      id: "edo-state",
      name: "Edo",
      region: "",
      country: "Nigeria",
      lat: 6.6342,
      lon: 5.9304,
      kind: "state",
    };
    const weather = {
      location: {
        name: "Ugbegun", // WeatherAPI's nearest town to the coordinates
        region: "Edo",
        country: "Nigeria",
        localTime: "2026-10-09 23:30",
        timezone: "Africa/Lagos",
      },
      current: {
        updatedAt: "2026-10-09 23:15",
        temperature: 24,
        feelsLike: 26,
        humidity: 90,
        windSpeed: 5,
        condition: "Mist",
        icon: "https://cdn.weatherapi.com/x.png",
      },
      forecast: [
        { date: "2026-10-09", high: 28, low: 22, chanceOfRain: 60, condition: "Mist", icon: "" },
      ],
      units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
    };
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([edo]));
      if (url.startsWith("/api/weather")) return Promise.resolve(jsonResponse(weather));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByRole("combobox"), "edo");
    await user.click(await screen.findByRole("option", { name: /Edo, Nigeria/ }));

    const heading = await screen.findByRole("heading", { level: 2, name: "Edo" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Nigeria")).toBeInTheDocument();
    expect(screen.queryByText("Ugbegun")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/weather?q=6.6342%2C5.9304")).toBe(
      true
    );
  });
});