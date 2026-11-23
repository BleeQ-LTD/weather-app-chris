import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchForm from "@/components/SearchForm";
import Home from "@/app/page";
import { rememberPlace } from "@/lib/searchHistory";
import type { Suggestion } from "@/lib/weather";
import { jsonResponse } from "../helpers";

const lagos = { name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.4541, lon: 3.3947 };
const accra = { name: "Accra", region: "Greater Accra", country: "Ghana", lat: 5.556, lon: -0.1969 };

function Harness({ onSelect }: { onSelect: (place: Suggestion) => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <SearchForm
      value={value}
      onChange={setValue}
      onSearch={() => {}}
      onSelectSuggestion={onSelect}
      onClear={() => setValue("")}
      isLoading={false}
      inputRef={inputRef}
    />
  );
}

function setup() {
  // Lagos first, then Accra, so Accra is the most recent
  rememberPlace(lagos);
  rememberPlace(accra);
  vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {}))); // suggestions never answer
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<Harness onSelect={onSelect} />);
  return { user, onSelect, input: screen.getByRole("combobox") };
}

const options = () => screen.queryAllByRole("option").map((option) => option.textContent ?? "");

afterEach(() => localStorage.clear());

describe("Recent searches in the search box", () => {
  it("shows when the empty box is focused, most recent first, with Clear at the end", async () => {
    const { user, input } = setup();
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();

    await user.click(input);

    expect(screen.getByText("Recent searches")).toBeInTheDocument();
    expect(options()).toEqual(["Accra, Greater Accra, Ghana", "Lagos, Nigeria", "Clear recent searches"]);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("disappears as soon as the user types", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.type(input, "Ab");
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
  });

  it("opens a recent place straight away with the keyboard", async () => {
    const { user, input, onSelect } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Lagos", country: "Nigeria", lat: 6.4541 }));
    expect(input).toHaveValue("Lagos, Nigeria");
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
  });

  it("removes the highlighted place with Delete, and with × by mouse", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard("{ArrowDown}{Delete}");
    expect(options()).toEqual(["Lagos, Nigeria", "Clear recent searches"]);

    await user.click(screen.getByTitle("Remove Lagos, Nigeria"));
    // Nothing left, so the list goes away
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
    expect(localStorage.getItem("weather-app:search-history")).toBeNull();
  });

  it("clears all recent searches", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.click(screen.getByRole("option", { name: "Clear recent searches" }));
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
    expect(localStorage.getItem("weather-app:search-history")).toBeNull();
  });

  it("closes with Escape and comes back with the down arrow", async () => {
    const { user, input } = setup();
    await user.click(input);
    await user.keyboard("{Escape}");
    expect(screen.queryByText("Recent searches")).not.toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Recent searches")).toBeInTheDocument();
  });
});

describe("What goes into recent searches", () => {
  it("adds a place only once its weather has loaded", async () => {
    const abuja: Suggestion = { id: "2", name: "Abuja", region: "Abuja", country: "Nigeria", lat: 9.0643, lon: 7.4893, kind: "city" };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([abuja]));
        return Promise.resolve(
          jsonResponse({
            location: { name: "Abuja", region: "Abuja", country: "Nigeria", localTime: "2026-11-23 14:00", timezone: "Africa/Lagos", lat: 9.06, lon: 7.49 },
            current: { updatedAt: "2026-11-23 14:00", temperature: 30, feelsLike: 32, humidity: 40, windSpeed: 8, condition: "Sunny", icon: "" },
            forecast: [{ date: "2026-11-23", high: 33, low: 21, chanceOfRain: 0, condition: "Sunny", icon: "" }],
            units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
          })
        );
      })
    );
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByRole("combobox"), "Abu");
    await user.click(await screen.findByRole("option", { name: /Abuja/ }));
    await screen.findByRole("heading", { level: 2, name: "Abuja" });

    const stored = JSON.parse(localStorage.getItem("weather-app:search-history") ?? "[]");
    expect(stored).toEqual([{ name: "Abuja", region: "Abuja", country: "Nigeria", lat: 9.0643, lon: 7.4893 }]);
  });

  it("doesn't add a place whose weather failed to load", async () => {
    const abuja: Suggestion = { id: "2", name: "Abuja", region: "Abuja", country: "Nigeria", lat: 9.0643, lon: 7.4893, kind: "city" };
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.startsWith("/api/search")
          ? Promise.resolve(jsonResponse([abuja]))
          : Promise.resolve(jsonResponse({ error: { code: "UPSTREAM_ERROR", message: "The weather service had a problem." } }, 502))
      )
    );
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.type(screen.getByRole("combobox"), "Abu");
    await user.click(await screen.findByRole("option", { name: /Abuja/ }));
    await within(container.querySelector("section") as HTMLElement).findByText("Weather unavailable");

    expect(localStorage.getItem("weather-app:search-history")).toBeNull();
  });
});
