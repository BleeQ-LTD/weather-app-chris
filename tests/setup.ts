import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The weather page shows an AccountBar, which loads Firebase.
// These tests check weather features, not sign-in, so we swap in an empty
// AccountBar. That way the tests don't need real Firebase settings.
vi.mock("@/components/AccountBar", () => ({
  default: () => null,
}));

// Pretend the visitor is a guest, so the weather page shows straight away
// (instead of the welcome screen), without loading real Firebase
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ status: "guest", continueAsGuest: () => {}, leaveGuestMode: () => {} }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});