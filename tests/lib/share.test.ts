import { describe, expect, it } from "vitest";
import { placeFromLink, shareLink, shareMessage, shareTargets } from "@/lib/share";
import type { WeatherData } from "@/lib/weather";

const ORIGIN = "https://chris-weather.bleeq.app";

function weather(overrides: { chanceOfRain?: number; feelsLike?: number; condition?: string; lat?: number | null } = {}): WeatherData {
  return {
    location: {
      name: "Lagos",
      region: "Lagos",
      country: "Nigeria",
      localTime: "2026-11-27 11:06",
      timezone: "Africa/Lagos",
      lat: overrides.lat === undefined ? 6.4541 : overrides.lat,
      lon: 3.3947,
    },
    current: {
      updatedAt: "2026-11-27 11:00",
      temperature: 31,
      feelsLike: overrides.feelsLike ?? 36,
      humidity: 70,
      windSpeed: 12,
      condition: overrides.condition ?? "Patchy light drizzle",
      icon: "",
      isDay: true,
    },
    forecast: [
      { date: "2026-11-27", high: 32, low: 27, chanceOfRain: overrides.chanceOfRain ?? 57, condition: "Patchy rain nearby", icon: "" },
    ],
    units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
  };
}

describe("shareLink and placeFromLink", () => {
  it("makes a link that opens the same place", () => {
    const link = shareLink(ORIGIN, weather().location)!;
    expect(link).toBe(`${ORIGIN}/?place=Lagos&region=Lagos&country=Nigeria&lat=6.4541&lon=3.3947`);
    expect(placeFromLink(new URL(link).search)).toEqual({
      name: "Lagos",
      region: "Lagos",
      country: "Nigeria",
      lat: 6.4541,
      lon: 3.3947,
    });
  });

  it("has no link when the weather service sent no coordinates", () => {
    expect(shareLink(ORIGIN, weather({ lat: null }).location)).toBeNull();
  });

  it("ignores links with missing or impossible parts", () => {
    expect(placeFromLink("")).toBeNull();
    expect(placeFromLink("?favourite=lagos_nigeria")).toBeNull();
    expect(placeFromLink("?place=Lagos&lat=6.45")).toBeNull();
    expect(placeFromLink("?place=Lagos&lat=abc&lon=3")).toBeNull();
    expect(placeFromLink("?place=Lagos&lat=95&lon=3")).toBeNull();
    expect(placeFromLink("?place=%20&lat=6&lon=3")).toBeNull();
  });
});

describe("shareMessage", () => {
  it("is friendly, gives the weather and invites them to tap the link", () => {
    const link = shareLink(ORIGIN, weather().location);
    expect(shareMessage(weather(), "C", link)).toBe(
      [
        "🌧️ Hey! Here's the weather in Lagos, Nigeria right now:",
        "31°C and patchy light drizzle (feels like 36°C).",
        "There's a 57% chance of rain today, so maybe take an umbrella ☂️",
        "",
        "Tap the link to see the full forecast for Lagos 👇",
        link,
      ].join("\n")
    );
  });

  it("uses the person's unit and fits the rain chance", () => {
    const message = shareMessage(weather({ chanceOfRain: 5, feelsLike: 31, condition: "Sunny" }), "F", null);
    expect(message).toContain("☀️ Hey!");
    expect(message).toContain("88°F and sunny.");
    expect(message).not.toContain("feels like");
    expect(message).toContain("Little chance of rain today 😎");
    expect(message).toContain("Check the full forecast on Weather.");
    expect(shareMessage(weather({ chanceOfRain: 30 }), "C", null)).toContain("There's a 30% chance of rain today.");
  });
});

describe("shareTargets", () => {
  it("fills in the message for each app", () => {
    const link = `${ORIGIN}/?place=Lagos&lat=6&lon=3`;
    const message = `Hello\n\nTap the link 👇\n${link}`;
    const targets = shareTargets(message, link, "The weather in Lagos");

    expect(targets.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);
    expect(targets.email).toBe(
      `mailto:?subject=${encodeURIComponent("The weather in Lagos")}&body=${encodeURIComponent(message)}`
    );
    // X and Telegram get the link separately, so it isn't in the text twice
    const x = new URL(targets.x);
    expect(x.searchParams.get("url")).toBe(link);
    expect(x.searchParams.get("text")).toBe("Hello\n\nTap the link 👇");
    expect(new URL(targets.telegram).searchParams.get("url")).toBe(link);
  });
});
