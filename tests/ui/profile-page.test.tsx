import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "@/app/profile/page";

// The page uses the router; tests/setup.ts already makes the visitor a guest
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/profile",
}));

describe("/profile for guests", () => {
  it("asks them to sign in instead of showing a form", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Your profile" })).toBeInTheDocument();
    expect(screen.getByText(/Sign in to see your profile/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
  });
});
