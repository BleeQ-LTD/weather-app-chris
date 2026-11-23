import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ComparePage from "@/app/compare/page";
import type { Suggestion, WeatherData } from "@/lib/weather";
import { jsonResponse } from "../helpers";

vi.mock("next/navigation", () => ({ usePathname: () => "/compare", useRouter: () => ({ replace: vi.fn() }) }));

const lagos: Suggestion = { id: "1", name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.4541, lon: 3.3947, kind: "city" };
const accra: Suggestion = { id: "2", name: "Accra", region: "Greater Accra", country: "Ghana", lat: 5.556, lon: -0.1969, kind: "city" };

function weather(place: Suggestion, temperature: number): WeatherData {
  return {
    location: { name: place.name, region: place.region, country: place.country, localTime: "2026-11-23 14:15", timezone: "Africa/Lagos", lat: place.lat, lon: place.lon },
    current: { updatedAt: "2026-11-23 14:00", temperature, feelsLike: temperature + 3, humidity: 70, windSpeed: 12, condition: "Sunny", icon: "", code: 1000, isDay: true },
    forecast: [
      { date: "2026-11-23", high: temperature + 1, low: temperature - 6, chanceOfRain: 20, condition: "Sunny", icon: "", code: 1000 },
      { date: "2026-11-24", high: temperature, low: temperature - 5, chanceOfRain: 60, condition: "Patchy rain nearby", icon: "", code: 1063 },
    ],
    units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
  };
}

// Fake API. accraWeather decides how Accra's weather request answers.
function mockApi(accraWeather: () => Promise<Response> = () => Promise.resolve(jsonResponse(weather(accra, 29)))) {
  const fetchMock = vi.fn((url: string) => {
    const q = decodeURIComponent(new URL(url, "http://localhost").searchParams.get("q") ?? "").toLowerCase();
    if (url.startsWith("/api/search")) {
      if ("lagos".startsWith(q) || q === "lagos") return Promise.resolve(jsonResponse([lagos]));
      if ("accra".startsWith(q) || q === "accra") return Promise.resolve(jsonResponse([accra]));
      return Promise.resolve(jsonResponse([]));
    }
    if (url.startsWith("/api/weather")) {
      if (q === "6.4541,3.3947") return Promise.resolve(jsonResponse(weather(lagos, 31)));
      if (q === "5.5560,-0.1969") return accraWeather();
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Type a place into one side's box and press that side's Search
async function searchOn(user: ReturnType<typeof userEvent.setup>, side: "First place" | "Second place", text: string) {
  const box = screen.getByRole("combobox", { name: side });
  await user.type(box, text);
  const form = box.closest("form") as HTMLElement;
  await user.click(within(form).getByRole("button", { name: "Search" }));
}

const headers = () => screen.getAllByRole("columnheader").map((cell) => cell.textContent ?? "");
const cellsOf = (label: string) =>
  within(screen.getByRole("rowheader", { name: label }).closest("[role=row]") as HTMLElement)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

afterEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

describe("Compare page", () => {
  it("loads both places and lines their weather up row by row", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<ComparePage />);

    await searchOn(user, "First place", "Lagos");
    await searchOn(user, "Second place", "Accra");

    await screen.findByText("Accra", {}, { timeout: 4000 });
    expect(headers()[0]).toMatch(/Lagos.*Nigeria/);
    expect(headers()[1]).toMatch(/Accra.*Greater Accra, Ghana/);
    expect(cellsOf("Now")[0]).toMatch(/31°C/);
    expect(cellsOf("Now")[1]).toMatch(/29°C/);
    expect(cellsOf("Feels like")).toEqual(["34°C", "32°C"]);
    expect(cellsOf("Chance of rain today")).toEqual(["20%", "20%"]);
    expect(cellsOf("Tomorrow")[0]).toMatch(/26°C.*31°C/);
  });

  it("keeps one side working when the other fails, and Try again reloads only that side", async () => {
    let accraFails = true;
    const fetchMock = mockApi(() =>
      accraFails
        ? Promise.resolve(jsonResponse({ error: { code: "SERVICE_UNAVAILABLE", message: "Couldn't reach the weather service. Check your connection and try again." } }, 503))
        : Promise.resolve(jsonResponse(weather(accra, 29)))
    );
    const user = userEvent.setup();
    render(<ComparePage />);

    await searchOn(user, "First place", "Lagos");
    await searchOn(user, "Second place", "Accra");

    const alert = await screen.findByRole("alert", {}, { timeout: 4000 });
    expect(alert).toHaveTextContent("Weather unavailable");
    expect(alert).toHaveTextContent("Couldn't reach the weather service.");
    expect(cellsOf("Now")[0]).toMatch(/31°C/); // Lagos is unaffected
    expect(cellsOf("Now")[1]).toMatch(/No data/);

    accraFails = false;
    const lagosCalls = fetchMock.mock.calls.filter(([url]) => url.includes("6.4541")).length;
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Accra", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(cellsOf("Now")[1]).toMatch(/29°C/);
    // Retrying Accra didn't reload Lagos
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("6.4541")).length).toBe(lagosCalls);
  });

  it("swaps the two places", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<ComparePage />);
    await searchOn(user, "First place", "Lagos");
    await searchOn(user, "Second place", "Accra");
    await screen.findByText("Accra", {}, { timeout: 4000 });

    await user.click(screen.getByRole("button", { name: "Swap the two places" }));

    expect(headers()[0]).toMatch(/Accra/);
    expect(headers()[1]).toMatch(/Lagos/);
    expect(screen.getByRole("combobox", { name: "First place" })).toHaveValue("Accra");
  });

  it("clears one side without touching the other", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<ComparePage />);
    await searchOn(user, "First place", "Lagos");
    await searchOn(user, "Second place", "Accra");
    await screen.findByText("Accra", {}, { timeout: 4000 });

    const firstForm = screen.getByRole("combobox", { name: "First place" }).closest("form") as HTMLElement;
    await user.click(within(firstForm).getByRole("button", { name: "Clear search" }));

    expect(headers()[0]).toMatch(/Pick a place above/);
    expect(headers()[1]).toMatch(/Accra/);
    expect(cellsOf("Now")[0]).toMatch(/No data/);
  });

  it("follows the °C/°F setting", async () => {
    mockApi();
    const user = userEvent.setup();
    render(<ComparePage />);
    await searchOn(user, "First place", "Lagos");
    await screen.findByText("Nigeria", {}, { timeout: 4000 });

    await user.click(screen.getByRole("button", { name: "°F" }));
    expect(cellsOf("Feels like")[0]).toBe("93°F");
  });

  it("starts with the place from the main page's Compare link", async () => {
    mockApi();
    window.history.replaceState(null, "", "/compare?name=Lagos&region=Lagos&country=Nigeria&lat=6.4541&lon=3.3947");
    render(<ComparePage />);

    expect(await screen.findByText("Nigeria", {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "First place" })).toHaveValue("Lagos, Nigeria");
    expect(window.location.search).toBe(""); // the address bar is tidied
  });
});
