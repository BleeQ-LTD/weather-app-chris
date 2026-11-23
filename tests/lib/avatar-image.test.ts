import { describe, expect, it } from "vitest";
import { MAX_PHOTO_CHARS, checkAvatarFile } from "@/lib/avatarImage";

describe("checkAvatarFile", () => {
  it("accepts JPG, PNG, WebP and GIF up to 10 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(checkAvatarFile({ type, size: 2_000_000 })).toBeNull();
    }
    expect(checkAvatarFile({ type: "image/jpeg", size: 10 * 1024 * 1024 })).toBeNull();
  });

  it("explains what's wrong with other files", () => {
    expect(checkAvatarFile({ type: "application/pdf", size: 1000 })).toBe("Choose a JPG, PNG, WebP or GIF image.");
    expect(checkAvatarFile({ type: "image/svg+xml", size: 1000 })).toBe("Choose a JPG, PNG, WebP or GIF image.");
    expect(checkAvatarFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).toMatch(/larger than 10 MB/);
    expect(checkAvatarFile({ type: "image/png", size: 0 })).toMatch(/empty/);
  });

  it("uses the same size limit as the Firestore rules", () => {
    expect(MAX_PHOTO_CHARS).toBe(60_000);
  });
});
