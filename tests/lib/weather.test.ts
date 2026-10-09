import { describe, expect, it } from "vitest";
import { matchesPlace } from "@/lib/weather";
import type { Suggestion } from "@/lib/weather";

const airport: Suggestion = {
  id: 9005631,
  name: "Balikesir Koca Seyit Airport",
  region: "Edremit",
  country: "Turkey",
};
const lagos: Suggestion = { id: 1, name: "Lagos", region: "Lagos", country: "Nigeria" };

describe("matchesPlace", () => {
  it("rejects a place that does not contain what was typed", () => {
    expect(matchesPlace("edo", airport)).toBe(false);
  });

  it("accepts text found in the name", () => {
    expect(matchesPlace("lagos", lagos)).toBe(true);
    expect(matchesPlace("LAG", lagos)).toBe(true);
  });

  it("accepts a name plus country, with or without a comma", () => {
    expect(matchesPlace("Lagos, Nigeria", lagos)).toBe(true);
    expect(matchesPlace("lagos nigeria", lagos)).toBe(true);
  });

  it("rejects when one word does not match", () => {
    expect(matchesPlace("lagos ghana", lagos)).toBe(false);
  });

  it("ignores accents and case", () => {
    const place = { id: 2, name: "São Paulo", region: "São Paulo", country: "Brazil" };
    expect(matchesPlace("sao paulo", place)).toBe(true);
  });

  it("rejects text with no letters or digits", () => {
    expect(matchesPlace(", ,", lagos)).toBe(false);
  });
});
