import { describe, expect, it } from "vitest";
import { favouriteErrorReason } from "@/lib/favouriteErrors";

describe("favouriteErrorReason", () => {
  it("says the user is offline before anything else", () => {
    expect(favouriteErrorReason({ code: "permission-denied" }, false)).toBe(
      "You're offline. Reconnect and try again."
    );
  });

  it("calls a timeout or unavailable service a slow connection", () => {
    expect(favouriteErrorReason({ code: "unavailable" }, true)).toMatch(/too slow/);
    expect(favouriteErrorReason({ code: "deadline-exceeded" }, true)).toMatch(/too slow/);
  });

  it("asks people to sign in again when they've been signed out", () => {
    expect(favouriteErrorReason({ code: "unauthenticated" }, true)).toMatch(/signed out/);
  });

  it("owns up to problems on our side, such as a rules rejection", () => {
    expect(favouriteErrorReason({ code: "permission-denied" }, true)).toBe(
      "Something went wrong on our side. Try again in a moment."
    );
    expect(favouriteErrorReason(new Error("boom"), true)).toMatch(/our side/);
    expect(favouriteErrorReason(null, true)).toMatch(/our side/);
  });

  it("understands codes with the firestore/ prefix", () => {
    expect(favouriteErrorReason({ code: "firestore/unavailable" }, true)).toMatch(/too slow/);
  });
});
