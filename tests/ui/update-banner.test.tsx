import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import UpdateBanner from "@/components/UpdateBanner";

const checkForUpdate = vi.fn();
vi.mock("@/lib/updateCheck", () => ({ checkForUpdate: () => checkForUpdate() }));

const NEWER = "515cd49f3e2b6d1a0c9e8f7a6b5c4d3e2f1a0b9c";

afterEach(() => {
  checkForUpdate.mockReset();
  sessionStorage.clear();
});

describe("UpdateBanner", () => {
  it("shows nothing when there's no newer version (or the check failed)", async () => {
    checkForUpdate.mockResolvedValue(null);
    render(<UpdateBanner />);
    await act(async () => {});
    expect(screen.queryByText("A new version is available")).not.toBeInTheDocument();
  });

  it("offers Reload when a newer version is live, and only reloads when pressed", async () => {
    checkForUpdate.mockResolvedValue(NEWER);
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    const user = userEvent.setup();
    render(<UpdateBanner />);

    expect(await screen.findByText("A new version is available")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled(); // never reloads by itself

    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("hides for this version when the person chooses Later", async () => {
    checkForUpdate.mockResolvedValue(NEWER);
    const user = userEvent.setup();
    const { unmount } = render(<UpdateBanner />);
    await user.click(await screen.findByRole("button", { name: "Later" }));
    expect(screen.queryByText("A new version is available")).not.toBeInTheDocument();

    // Still hidden after the page re-renders it in this tab
    unmount();
    render(<UpdateBanner />);
    await act(async () => {});
    expect(screen.queryByText("A new version is available")).not.toBeInTheDocument();
  });

  it("checks again when the person comes back to the tab", async () => {
    checkForUpdate.mockResolvedValueOnce(null).mockResolvedValueOnce(NEWER);
    render(<UpdateBanner />);
    await act(async () => {});
    expect(checkForUpdate).toHaveBeenCalledTimes(1);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(checkForUpdate).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("A new version is available")).toBeInTheDocument();
  });
});
