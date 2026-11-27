import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { jsonResponse } from "../helpers";

// The weather service names the spot after a nearby locality; the shared name should win
const weatherBody = {
  location: { name: "Ikeja", region: "Lagos", country: "Nigeria", localTime: "2026-11-27 11:06", timezone: "Africa/Lagos", lat: 6.45, lon: 3.39 },
  current: { updatedAt: "2026-11-27 11:00", temperature: 31, feelsLike: 36, humidity: 70, windSpeed: 12, condition: "Patchy light drizzle", icon: "" },
  forecast: [{ date: "2026-11-27", high: 32, low: 27, chanceOfRain: 57, condition: "Patchy rain nearby", icon: "" }],
  units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
};

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("Opening a shared link", () => {
  it("shows the shared place's live weather straight away, then tidies the address", async () => {
    const fetchMock = vi.fn((url: string) =>
      url.startsWith("/api/weather") ? Promise.resolve(jsonResponse(weatherBody)) : Promise.reject(new Error(url))
    );
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/?place=Lagos&region=Lagos&country=Nigeria&lat=6.4541&lon=3.3947");

    render(<Home />);

    expect(await screen.findByRole("heading", { name: "Lagos" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/weather?q=6.4541%2C3.3947", expect.anything());
    expect(screen.getByRole("combobox")).toHaveValue("Lagos, Nigeria");
    expect(window.location.search).toBe("");
  });

  it("ignores a broken link and shows the normal start screen", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("no request expected")));
    vi.stubGlobal("fetch", fetchMock);
    window.history.replaceState(null, "", "/?place=Lagos&lat=999&lon=3");

    render(<Home />);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveValue("");
  });
});
