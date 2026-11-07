import { describe, expect, it } from "vitest";
import { timeOfDayGreeting, weatherAdvice } from "@/lib/advice";
import type { WeatherData } from "@/lib/weather";

// Only the fields the advice reads; the rest of WeatherData isn't needed here
function weather({
  condition = "Sunny",
  temperature = 25,
  windSpeed = 10,
  chanceOfRain = 0,
}: { condition?: string; temperature?: number; windSpeed?: number; chanceOfRain?: number } = {}) {
  return {
    location: { localTime: "2026-11-05 13:00" },
    current: { condition, temperature, windSpeed },
    forecast: [{ chanceOfRain }],
  } as unknown as WeatherData;
}

describe("timeOfDayGreeting", () => {
  it("greets by the place's local time", () => {
    expect(timeOfDayGreeting("2026-11-05 08:15")).toBe("Good morning");
    expect(timeOfDayGreeting("2026-11-05 13:42")).toBe("Good afternoon");
    expect(timeOfDayGreeting("2026-11-05 19:05")).toBe("Good evening");
    expect(timeOfDayGreeting("2026-11-05 02:00")).toBe("Good evening");
  });

  it("falls back to Hello for an unexpected time", () => {
    expect(timeOfDayGreeting("not a time")).toBe("Hello");
  });
});

describe("weatherAdvice", () => {
  it("suggests an umbrella when it's raining", () => {
    expect(weatherAdvice(weather({ condition: "Patchy light rain" }))).toMatch(/umbrella/);
  });

  it("suggests an umbrella when rain is likely later", () => {
    expect(weatherAdvice(weather({ chanceOfRain: 70 }))).toBe(
      "There's a 70% chance of rain today, so take an umbrella."
    );
  });

  it("warns about thunder before anything else", () => {
    expect(weatherAdvice(weather({ condition: "Thundery outbreaks", chanceOfRain: 90 }))).toMatch(/thunder/);
  });

  it("warns about heat and cold", () => {
    expect(weatherAdvice(weather({ temperature: 35 }))).toMatch(/water/);
    expect(weatherAdvice(weather({ temperature: 5 }))).toMatch(/jacket/);
  });

  it("has something friendly to say on a calm day", () => {
    expect(weatherAdvice(weather())).toBe("Looks like a good day to be out.");
  });
});