import { describe, expect, it } from "vitest";
import { profileSaveError, validateProfileFields } from "@/lib/profile";

describe("validateProfileFields", () => {
  it("accepts a name and one of the gender options", () => {
    expect(validateProfileFields("Chris", "male")).toEqual({});
    expect(validateProfileFields("  Chris  ", "prefer-not-to-say")).toEqual({});
  });

  it("asks for a name when it's empty or only spaces", () => {
    expect(validateProfileFields("   ", "male").name).toBe("Please enter your name.");
  });

  it("rejects a name over 50 characters, like the Firestore rules", () => {
    expect(validateProfileFields("a".repeat(50), "male")).toEqual({});
    expect(validateProfileFields("a".repeat(51), "male").name).toBe("Name must be 50 characters or fewer.");
  });

  it("asks for a gender when none, or an unknown one, is chosen", () => {
    expect(validateProfileFields("Chris", "").gender).toBe("Please choose an option.");
    expect(validateProfileFields("Chris", "robot").gender).toBe("Please choose an option.");
  });
});

describe("profileSaveError", () => {
  it("gives the real reason a save failed", () => {
    expect(profileSaveError(null, false)).toBe("You're offline. Reconnect and try again.");
    expect(profileSaveError({ code: "unavailable" }, true)).toMatch(/too slow/);
    expect(profileSaveError({ code: "auth/network-request-failed" }, true)).toMatch(/too slow/);
    expect(profileSaveError({ code: "unauthenticated" }, true)).toMatch(/signed out/);
    expect(profileSaveError({ code: "permission-denied" }, true)).toBe(
      "Something went wrong on our side. Try again in a moment."
    );
  });
});
