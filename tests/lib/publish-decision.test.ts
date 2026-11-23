import { describe, expect, it } from "vitest";
import { shouldPublish } from "../../scripts/latestVersion.mjs";

const OLD = "10cdf20add907f1c133c3f782378cf75ac25658d";
const NEW = "ac8e549aac241ccc641823231391589c42f9fe7e";
// Pretend git history: OLD came before NEW
const isAncestor = (older: string, newer: string) => older === OLD && newer === NEW;

describe("shouldPublish (the GitHub Action's decision)", () => {
  it("publishes the first version, and a newer commit", () => {
    expect(shouldPublish("", NEW, isAncestor)).toEqual({ publish: true });
    expect(shouldPublish(OLD, NEW, isAncestor)).toEqual({ publish: true });
  });

  it("skips a commit that's already published", () => {
    expect(shouldPublish(NEW, NEW, isAncestor)).toMatchObject({ publish: false, reason: "already published" });
  });

  it("refuses an older commit, e.g. a re-deploy of an old version", () => {
    expect(shouldPublish(NEW, OLD, isAncestor)).toMatchObject({ publish: false, reason: "older than the published commit" });
  });

  it("refuses anything that isn't a full commit hash", () => {
    expect(shouldPublish("", "ac8e549", isAncestor).publish).toBe(false);
    expect(shouldPublish("", "", isAncestor).publish).toBe(false);
  });
});
