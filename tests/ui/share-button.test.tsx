import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareButton from "@/components/ShareButton";
import type { WeatherData } from "@/lib/weather";

const data: WeatherData = {
  location: { name: "Lagos", region: "Lagos", country: "Nigeria", localTime: "2026-11-27 11:06", timezone: "Africa/Lagos", lat: 6.4541, lon: 3.3947 },
  current: { updatedAt: "", temperature: 31, feelsLike: 36, humidity: 70, windSpeed: 12, condition: "Patchy light drizzle", icon: "", isDay: true },
  forecast: [{ date: "2026-11-27", high: 32, low: 27, chanceOfRain: 57, condition: "Patchy rain nearby", icon: "" }],
  units: { temperature: "°C", windSpeed: "km/h", humidity: "%", chanceOfRain: "%" },
};

// Pretend to be a phone (touch screen) or a computer (mouse)
function pointer(coarse: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: coarse && query.includes("coarse"), media: query }));
}

afterEach(() => {
  // @ts-expect-error tests add and remove navigator.share
  delete navigator.share;
});

describe("ShareButton", () => {
  it("on a computer, lists WhatsApp and other apps with the message filled in", async () => {
    pointer(false);
    const user = userEvent.setup();
    render(<ShareButton data={data} />);

    await user.click(screen.getByRole("button", { name: /^Shares*the weather in Lagos$/ }));

    const whatsapp = screen.getByRole("link", { name: "WhatsApp" });
    const text = new URL(whatsapp.getAttribute("href")!).searchParams.get("text")!;
    expect(text).toContain("Hey! Here's the weather in Lagos, Nigeria right now");
    expect(text).toContain("Tap the link to see the full forecast for Lagos");
    expect(text).toContain("/?place=Lagos&region=Lagos&country=Nigeria&lat=6.4541&lon=3.3947");
    expect(whatsapp).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Telegram" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "X (Twitter)" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute("href", expect.stringMatching(/^mailto:/));

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("copies the message and says so", async () => {
    pointer(false);
    const user = userEvent.setup();
    render(<ShareButton data={data} />);

    await user.click(screen.getByRole("button", { name: /Share/ }));
    await user.click(screen.getByRole("button", { name: "Copy message" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Copied! Paste it into any chat.");
    expect(await navigator.clipboard.readText()).toContain("Hey! Here's the weather in Lagos");
  });

  it("explains when the browser won't copy", async () => {
    pointer(false);
    const user = userEvent.setup();
    render(<ShareButton data={data} />);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("blocked"));

    await user.click(screen.getByRole("button", { name: /Share/ }));
    await user.click(screen.getByRole("button", { name: "Copy message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Your browser didn't let us copy.");
  });

  it("on a phone, opens the phone's own share menu", async () => {
    pointer(true);
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    render(<ShareButton data={data} />);

    await user.click(screen.getByRole("button", { name: /Share/ }));

    expect(share).toHaveBeenCalledWith({
      title: "The weather in Lagos",
      text: expect.stringContaining("Tap the link to see the full forecast for Lagos"),
    });
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("does nothing more when they close the phone's share menu", async () => {
    pointer(true);
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    render(<ShareButton data={data} />);

    await user.click(screen.getByRole("button", { name: /Share/ }));

    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("falls back to the list when the phone can't share", async () => {
    pointer(true);
    const share = vi.fn().mockRejectedValue(new DOMException("nope", "NotAllowedError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const user = userEvent.setup();
    render(<ShareButton data={data} />);

    await user.click(screen.getByRole("button", { name: /Share/ }));

    expect(await screen.findByRole("link", { name: "WhatsApp" })).toBeInTheDocument();
  });
});
