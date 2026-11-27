import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import FavouritesList from "@/components/FavouritesList";
import type { Favourite } from "@/lib/favourites";
import type { FavouritesState } from "@/lib/useFavourites";

// Keep the real favouriteLabel; only removing talks to Firestore, so fake that
const removeFavourite = vi.fn();
vi.mock("@/lib/favourites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/favourites")>()),
  removeFavourite: (...args: unknown[]) => removeFavourite(...args),
}));

const lagos: Favourite = { id: "lagos_nigeria", name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.45, lon: 3.39 };
const accra: Favourite = { id: "accra_ghana", name: "Accra", region: "", country: "Ghana", lat: 5.6, lon: -0.19 };

function state(overrides: Partial<FavouritesState> = {}): FavouritesState {
  return { uid: "alice", items: [lagos, accra], isLoading: false, isSlow: false, failed: false, retry: vi.fn(), ...overrides };
}

function rowFor(name: string) {
  return screen.getByRole("button", { name: new RegExp(`^Remove ${name}`) }).closest("li") as HTMLElement;
}

afterEach(() => {
  removeFavourite.mockReset();
});

describe("FavouritesList messages", () => {
  it("shows a failed Remove under that place, with the real reason", async () => {
    removeFavourite.mockRejectedValue({ code: "unavailable" });
    const user = userEvent.setup();
    render(<FavouritesList favourites={state()} onPick={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Remove Lagos, Nigeria from favourites" }));

    const message = await within(rowFor("Lagos")).findByRole("alert");
    expect(message).toHaveTextContent("Couldn't remove Lagos, Nigeria. The connection is too slow right now.");
    // Only that place shows it
    expect(within(rowFor("Accra")).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says you're offline straight away instead of waiting", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const user = userEvent.setup();
    render(<FavouritesList favourites={state()} onPick={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Remove Accra, Ghana from favourites" }));

    expect(within(rowFor("Accra")).getByRole("alert")).toHaveTextContent("You're offline. Reconnect and try again.");
    expect(removeFavourite).not.toHaveBeenCalled();
  });

  it("shows a small load error with Try again next to it", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();
    render(
      <FavouritesList
        favourites={state({ items: [], failed: true, failure: { code: "deadline-exceeded" }, retry })}
        onPick={() => {}}
      />
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your saved places are taking longer than usual to load.");
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
