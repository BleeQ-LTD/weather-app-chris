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

describe("favouritesLoadMessage", () => {
  it("is friendly and gives the real reason", async () => {
    const { favouritesLoadMessage, LOAD_TIMED_OUT } = await import("@/lib/favouriteErrors");
    expect(favouritesLoadMessage(null, false)).toMatch(/because you're offline\. Reconnect, then tap Try again/);
    expect(favouritesLoadMessage(LOAD_TIMED_OUT, true)).toMatch(/taking longer than usual.*connection may be slow/);
    expect(favouritesLoadMessage({ code: "firestore/unavailable" }, true)).toMatch(/connection may be slow/);
    expect(favouritesLoadMessage({ code: "unauthenticated" }, true)).toMatch(/signed out.*Sign in again/);
    expect(favouritesLoadMessage({ code: "permission-denied" }, true)).toBe(
      "Sorry, we couldn't load your saved places. That's a problem on our side, not yours. Tap Try again in a moment."
    );
  });
});
