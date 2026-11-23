import { describe, expect, it } from "vitest";
import { isNewerVersion, shortVersion } from "@/lib/appVersion";

const A = "ac8e549aac241ccc641823231391589c42f9fe7e";
const B = "515cd49f3e2b6d1a0c9e8f7a6b5c4d3e2f1a0b9c";

describe("isNewerVersion", () => {
  it("is true when a different commit is published", () => {
    expect(isNewerVersion(B, A)).toBe(true);
  });

  it("is false when the published commit is the one running", () => {
    expect(isNewerVersion(A, A)).toBe(false);
    expect(isNewerVersion(A.toUpperCase(), A)).toBe(false);
  });

  it("treats a short hash as the same commit as its full hash", () => {
    expect(isNewerVersion("ac8e549", A)).toBe(false);
    expect(isNewerVersion(A, "ac8e549")).toBe(false);
    expect(isNewerVersion("515cd49", A)).toBe(true);
  });

  it("never prompts when either version is missing or not a commit", () => {
    expect(isNewerVersion("", A)).toBe(false); // nothing published yet
    expect(isNewerVersion(B, "")).toBe(false); // update check off for this build
    expect(isNewerVersion("0.2.0", A)).toBe(false);
    expect(isNewerVersion(B, "0.1.0")).toBe(false);
  });
});

describe("shortVersion", () => {
  it("shows the first 7 characters of a commit, or nothing", () => {
    expect(shortVersion(A)).toBe("ac8e549");
    expect(shortVersion("")).toBe("");
  });
});
