import { describe, expect, it } from "vitest";
import { heroTone, isDaytime, uvLevel, weatherKind, windFrom } from "@/lib/conditions";
import { convertTemp, formatAstroTime, formatClock, formatHour } from "@/lib/weather";

describe("weatherKind", () => {
  it("maps WeatherAPI condition codes", () => {
    expect(weatherKind(1000)).toBe("clear");
    expect(weatherKind(1003)).toBe("partly-cloudy");
    expect(weatherKind(1009)).toBe("cloudy");
    expect(weatherKind(1135)).toBe("fog");
    expect(weatherKind(1183)).toBe("rain");
    expect(weatherKind(1063)).toBe("rain"); // "Patchy rain nearby"
    expect(weatherKind(1213)).toBe("snow");
    expect(weatherKind(1276)).toBe("thunder");
  });

  it("falls back to the condition text when there is no code", () => {
    expect(weatherKind(undefined, "Mist")).toBe("fog");
    expect(weatherKind(undefined, "Moderate rain")).toBe("rain");
    expect(weatherKind(undefined, "Partly Cloudy")).toBe("partly-cloudy");
    expect(weatherKind(undefined, "Sunny")).toBe("clear");
  });
});

describe("hero background", () => {
  it("is warm for sun, cool for rain or cloud, navy at night", () => {
    expect(heroTone("clear", true)).toBe("sun");
    expect(heroTone("partly-cloudy", true)).toBe("sun");
    expect(heroTone("rain", true)).toBe("rain");
    expect(heroTone("cloudy", true)).toBe("rain");
    expect(heroTone("clear", false)).toBe("night");
  });

  it("uses WeatherAPI's day flag, or guesses from the local hour", () => {
    expect(isDaytime(false, "2026-11-10 13:00")).toBe(false);
    expect(isDaytime(undefined, "2026-11-10 13:00")).toBe(true);
    expect(isDaytime(undefined, "2026-11-10 23:30")).toBe(false);
  });
});

describe("detail helpers", () => {
  it("spells out the wind direction", () => {
    expect(windFrom("SW")).toBe("south-west");
    expect(windFrom("NNE")).toBe("north-north-east");
    expect(windFrom(undefined)).toBe("");
    expect(windFrom("??")).toBe("");
  });

  it("names the UV level", () => {
    expect(uvLevel(1)).toBe("Low");
    expect(uvLevel(5)).toBe("Moderate");
    expect(uvLevel(9)).toBe("Very high");
    expect(uvLevel(11)).toBe("Extreme");
  });
});

describe("time and temperature formatting", () => {
  it("formats hours and clock times in 12-hour style", () => {
    expect(formatHour("2026-11-10 15:00")).toBe("3 pm");
    expect(formatHour("2026-11-10 00:00")).toBe("12 am");
    expect(formatHour("2026-11-10 9:00")).toBe("9 am");
    expect(formatClock("13:42")).toBe("1:42 pm");
    expect(formatClock("00:05")).toBe("12:05 am");
    expect(formatAstroTime("06:41 AM")).toBe("6:41 am");
    expect(formatAstroTime("06:39 PM")).toBe("6:39 pm");
  });

  it("converts temperatures to whole degrees", () => {
    expect(convertTemp(31.4)).toBe(31);
    expect(convertTemp(31, "F")).toBe(88);
  });
});
