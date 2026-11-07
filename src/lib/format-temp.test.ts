import { describe, expect, it } from "vitest";
import { formatTemp } from "@/lib/weather";

describe("formatTemp", () => {
  it("shows Celsius by default", () => {
    expect(formatTemp(28.4)).toBe("28°C");
  });

  it("converts to Fahrenheit when asked", () => {
    expect(formatTemp(0, "F")).toBe("32°F");
    expect(formatTemp(100, "F")).toBe("212°F");
    expect(formatTemp(28, "F")).toBe("82°F");
  });
});