import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import { jsonResponse } from "../helpers";

const airport = {
  id: 9005631,
  name: "Balikesir Koca Seyit Airport",
  region: "Edremit",
  country: "Turkey",
};

function resultsSection(container: HTMLElement) {
  return within(container.querySelector("section") as HTMLElement);
}

describe("Home page with a single, unrelated match", () => {
  it('asks "did you mean" instead of loading the weather for "edo"', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([airport]));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.type(screen.getByRole("combobox"), "edo");
    await user.click(screen.getByRole("button", { name: "Search" }));

    const section = resultsSection(container);
    expect(await section.findByText(/No exact match for/)).toBeInTheDocument();
    expect(
      section.getByRole("button", { name: /Balikesir Koca Seyit Airport/ })
    ).toBeInTheDocument();
    const weatherCalls = fetchMock.mock.calls.filter(([url]) => url.startsWith("/api/weather"));
    expect(weatherCalls).toHaveLength(0);
  });

  it("loads the weather straight away when the single match is what was typed", async () => {
    const lagos = { id: 1, name: "Lagos", region: "Lagos", country: "Nigeria" };
    const fetchMock = vi.fn((url: string) => {
      if (url.startsWith("/api/search")) return Promise.resolve(jsonResponse([lagos]));
      return new Promise<Response>(() => {}); // weather never answers
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.type(screen.getByRole("combobox"), "Lagos");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await resultsSection(container).findByText(/Loading weather for Lagos, Nigeria/);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/weather?q=id%3A1")).toBe(true);
  });
});
