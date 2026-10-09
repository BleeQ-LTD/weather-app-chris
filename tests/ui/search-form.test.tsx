import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import SearchForm from "@/components/SearchForm";
import type { Suggestion } from "@/lib/weather";
import { deferred, jsonResponse } from "../helpers";

const lagos: Suggestion = { id: 1, name: "Lagos", region: "Lagos", country: "Nigeria" };

function Harness({
  onSearch,
  onSelectSuggestion,
}: {
  onSearch: (text: string) => void;
  onSelectSuggestion: (suggestion: Suggestion) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <SearchForm
      value={value}
      onChange={setValue}
      onSearch={onSearch}
      onSelectSuggestion={onSelectSuggestion}
      isLoading={false}
      inputRef={inputRef}
    />
  );
}

function setup() {
  const onSearch = vi.fn();
  const onSelectSuggestion = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSearch={onSearch} onSelectSuggestion={onSelectSuggestion} />);
  const input = screen.getByRole("combobox");
  return { user, input, onSearch, onSelectSuggestion };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("SearchForm suggestions", () => {
  it("does not pick a stale suggestion after the text changes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.includes("q=la&") || url.endsWith("q=la")
          ? Promise.resolve(jsonResponse([lagos]))
          : new Promise<Response>(() => {}) // any other query never resolves
      )
    );
    const { user, input, onSearch, onSelectSuggestion } = setup();

    await user.type(input, "la");
    await screen.findByRole("option", { name: /Lagos/ });
    await user.keyboard("{ArrowDown}");

    // "la" -> "lon": replace the "a", so the text never drops below 2 characters
    await user.type(input, "on", { initialSelectionStart: 1, initialSelectionEnd: 2 });
    expect(input).toHaveValue("lon");
    await user.keyboard("{Enter}");

    expect(onSelectSuggestion).not.toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith("lon");
  });

  it("stays closed when suggestions arrive after Escape", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));
    const { user, input } = setup();

    await user.type(input, "la");
    await act(() => sleep(350)); // the request is now in flight
    await user.keyboard("{Escape}");

    await act(async () => {
      pending.resolve(jsonResponse([lagos]));
      await sleep(50);
    });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("stays closed when suggestions arrive after the input loses focus", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(() => pending.promise));
    const { user, input } = setup();

    await user.type(input, "la");
    await act(() => sleep(350));
    await user.tab();

    await act(async () => {
      pending.resolve(jsonResponse([lagos]));
      await sleep(50);
    });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});
