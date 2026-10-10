import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/page";
import type { Suggestion } from "@/lib/weather";
import { abortError, deferred, jsonResponse } from "../helpers";

const lagos: Suggestion = { id: "1", name: "Lagos", region: "Lagos", country: "Nigeria", lat: 6.4541, lon: 3.3947, kind: "city" };
const abuja: Suggestion = { id: "2", name: "Abuja", region: "Abuja", country: "Nigeria", lat: 9.0643, lon: 7.4893, kind: "city" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Routes fake responses by URL. `lagosSearch` and `lagosWeather` let a test
// decide exactly when the Lagos response bodies arrive.
function mockApi(handlers: {
  lagosSearch: () => Promise<unknown> | unknown;
  lagosWeather: () => Promise<unknown> | unknown;
}) {
  const fetchMock = vi.fn((url: string) => {
    const q = decodeURIComponent(new URL(url, "http://localhost").searchParams.get("q") ?? "");
    if (url.startsWith("/api/search")) {
      if (q === "Lagos") return Promise.resolve(handlers.lagosSearch());
      if (q === "Abu") return Promise.resolve(jsonResponse([abuja]));
    }
    if (url.startsWith("/api/weather")) {
      if (q === "6.4541,3.3947") return Promise.resolve(handlers.lagosWeather());
      if (q === "9.0643,7.4893") return new Promise<Response>(() => {}); // Abuja never finishes
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// Pick Abuja from the suggestions, the way a user switching cities would
async function switchToAbuja(user: ReturnType<typeof userEvent.setup>) {
  const input = screen.getByRole("combobox");
  await user.clear(input);
  await user.type(input, "Abu");
  await user.click(await screen.findByRole("option", { name: /Abuja/ }));
}

function resultsSection(container: HTMLElement) {
  return within(container.querySelector("section") as HTMLElement);
}

describe("Home page request handling", () => {
  it("ignores a cancelled weather request whose body fails afterwards", async () => {
    const lagosBody = deferred<unknown>();
    mockApi({
      lagosSearch: () => jsonResponse([lagos]),
      lagosWeather: () => ({ ok: true, json: () => lagosBody.promise }),
    });
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "Lagos" }));
    await resultsSection(container).findByText(/Loading weather for Lagos, Nigeria/);

    await switchToAbuja(user);
    await resultsSection(container).findByText(/Loading weather for Abuja, Nigeria/);

    // The cancelled Lagos request now fails while reading its body
    await act(async () => {
      lagosBody.reject(abortError());
      await sleep(50);
    });

    const section = resultsSection(container);
    expect(section.queryByText("Weather unavailable")).not.toBeInTheDocument();
    expect(section.getByText(/Loading weather for Abuja, Nigeria/)).toBeInTheDocument();
  });

  it("ignores a superseded search whose body arrives late", async () => {
    const lagosSearchBody = deferred<Suggestion[]>();
    const fetchMock = mockApi({
      lagosSearch: () => ({ ok: true, json: () => lagosSearchBody.promise }),
      lagosWeather: () => new Promise(() => {}), // never answers
    });
    const user = userEvent.setup();
    const { container } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "Lagos" }));
    await switchToAbuja(user);
    await resultsSection(container).findByText(/Loading weather for Abuja, Nigeria/);

    // The old Lagos search finally answers
    await act(async () => {
      lagosSearchBody.resolve([lagos]);
      await sleep(50);
    });

    const weatherCalls = fetchMock.mock.calls
      .map(([url]) => url)
      .filter((url) => url.startsWith("/api/weather"));
    expect(weatherCalls).toEqual(["/api/weather?q=9.0643%2C7.4893"]);
    expect(resultsSection(container).getByText(/Loading weather for Abuja, Nigeria/)).toBeInTheDocument();
  });
});