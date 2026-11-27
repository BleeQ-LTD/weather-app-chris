import { describe, expect, it, vi } from "vitest";
import { subscribeToFavourites } from "@/lib/favourites";

// Fake Firestore: capture what onSnapshot is called with, and let the test send snapshots
type Listener = (snapshot: unknown) => void;
const calls: { options: unknown; next: Listener }[] = [];
vi.mock("firebase/firestore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("firebase/firestore")>()),
  collection: () => ({}),
  orderBy: () => ({}),
  query: () => ({}),
  onSnapshot: (_query: unknown, options: unknown, next: Listener) => {
    calls.push({ options, next });
    return () => {};
  },
}));

const lagos = { id: "lagos_nigeria", data: () => ({ name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.45, lon: 3.4 }) };
const snapshot = (fromCache: boolean) => ({ docs: [lagos], metadata: { fromCache } });

describe("subscribeToFavourites", () => {
  it("asks Firestore for metadata changes, so the server's answer always arrives", () => {
    subscribeToFavourites("ada", () => {}, () => {});
    expect(calls.at(-1)?.options).toEqual({ includeMetadataChanges: true });
  });

  it("passes on the cached list and then the server's identical list", () => {
    const onChange = vi.fn();
    subscribeToFavourites("ada", onChange, () => {});
    const { next } = calls.at(-1)!;

    next(snapshot(true)); // what the cache had
    next(snapshot(false)); // the server confirms the same places: only fromCache changed

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(
      [{ id: "lagos_nigeria", name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.45, lon: 3.4 }],
      false
    );
  });
});
