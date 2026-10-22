import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Swap in empty Firebase objects so no test tries to connect to real Firebase
vi.mock("@/lib/firebase", () => ({ app: {}, auth: {}, db: {} }));

// The weather page shows an AccountBar, which loads Firebase.
// These tests check weather features, not sign-in, so we swap in an empty AccountBar.
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