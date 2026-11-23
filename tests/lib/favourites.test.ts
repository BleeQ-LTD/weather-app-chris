import { describe, expect, it } from "vitest";
import { favouriteId, favouriteLabel } from "@/lib/favourites";

describe("favouriteId", () => {
  it("builds the same id from the name and country", () => {
    expect(favouriteId("Lagos", "Nigeria")).toBe("lagos_nigeria");
    expect(favouriteId("lagos", "NIGERIA")).toBe("lagos_nigeria");
  });

  it("keeps same-named places in different countries apart", () => {
    expect(favouriteId("Lagos", "Nigeria")).not.toBe(favouriteId("Lagos", "Portugal"));
  });

  it("turns accents and symbols into safe characters", () => {
    expect(favouriteId("São Paulo", "Brazil")).toBe("sao-paulo_brazil");
  });
});

describe("favouriteLabel", () => {
  it("shows the name and country", () => {
    expect(favouriteLabel({ name: "Lagos", region: "Lagos", country: "Nigeria" })).toBe("Lagos, Nigeria");
  });

  it("includes the region when it adds something", () => {
    expect(favouriteLabel({ name: "Lagos", region: "Algarve", country: "Portugal" })).toBe("Lagos, Algarve, Portugal");
  });

  it("shows just the name for older favourites without a country", () => {
    expect(favouriteLabel({ name: "Abuja", region: "", country: "" })).toBe("Abuja");
  });
});