"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherData } from "@/lib/weather";
import { useTemperatureUnit } from "@/lib/units";
import { shareLink, shareMessage, shareTargets } from "@/lib/share";
import { AlertIcon, CheckIcon } from "@/components/icons";

const COPIED_MESSAGE_MS = 3000;

// Phones and tablets have a share menu people already know (WhatsApp, SMS, …),
// so we use it there. Computers get our own list instead.
function useNativeShare(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}

// "Share" next to Save and Compare: sends this place's weather, with a link
// that opens the same place in the app.
export default function ShareButton({ data }: { data: WeatherData }) {
  const unit = useTemperatureUnit();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  const nativeShare = useNativeShare();

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = shareLink(origin, data.location);
  const message = shareMessage(data, unit, link);
  const subject = `The weather in ${data.location.name}`;
  const targets = shareTargets(message, link, subject);

  // Close the list with Escape or a click/tap outside it
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Hide "Copied" after a few seconds
  useEffect(() => {
    if (status?.kind !== "ok") return;
    const timer = setTimeout(() => setStatus(null), COPIED_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [status]);

  async function handleClick() {
    setStatus(null);
    if (nativeShare) {
      try {
        // The message already ends with the link, so it isn't passed separately
        // (some apps would paste it twice)
        await navigator.share({ title: subject, text: message });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // they closed the share menu
        // The phone couldn't share: offer our own list instead
      }
    }
    setOpen((value) => !value);
  }

  async function copyMessage() {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(message);
      setStatus({ kind: "ok", text: "Copied! Paste it into any chat." });
    } catch {
      setStatus({
        kind: "error",
        text: "Your browser didn't let us copy. Try one of the apps instead, or copy the address bar.",
      });
    }
  }

  const option =
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-ink hover:bg-accent-soft";

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={nativeShare ? undefined : open}
        aria-haspopup={nativeShare ? undefined : "true"}
        className="inline-flex h-11 items-center gap-2 rounded-full border border-hero-save-line bg-hero-save pr-[18px] pl-3.5 text-[15px] font-semibold whitespace-nowrap text-hero-ink hover:brightness-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share
        <span className="sr-only"> the weather in {data.location.name}</span>
      </button>

      {open && (
        <div
          role="group"
          aria-label="Share with"
          className="absolute top-full left-0 z-20 mt-2 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-lg"
        >
          <a href={targets.whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={option}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#25D366] text-sm text-white">W</span>
            WhatsApp
          </a>
          <a href={targets.telegram} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={option}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-[#229ED9] text-sm text-white">T</span>
            Telegram
          </a>
          <a href={targets.x} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={option}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-black text-sm text-white">X</span>
            X (Twitter)
          </a>
          <a href={targets.email} onClick={() => setOpen(false)} className={option}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-rain text-sm text-white">@</span>
            Email
          </a>
          <button type="button" onClick={copyMessage} className={option}>
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-full bg-line text-sm">⧉</span>
            Copy message
          </button>
        </div>
      )}

      {status?.kind === "ok" && (
        <p role="status" className="absolute top-full left-0 mt-2 flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-hero-ink">
          <CheckIcon size={16} />
          {status.text}
        </p>
      )}
      {status?.kind === "error" && (
        <p role="alert" className="mt-2 flex max-w-xs items-start gap-1.5 text-sm font-medium text-hero-ink">
          <AlertIcon size={16} className="mt-0.5 shrink-0" />
          {status.text}
        </p>
      )}
    </div>
  );
}
