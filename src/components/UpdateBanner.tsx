"use client";

import { useEffect, useState } from "react";
import { checkForUpdate } from "@/lib/updateCheck";
import { RefreshIcon } from "@/components/icons";

const CHECK_EVERY_MS = 30 * 60_000; // matches the Remote Config fetch interval
const DISMISSED_KEY = "weather-app:update-dismissed"; // "Later" for this tab, per version

function dismissedVersion(): string | null {
  try {
    return sessionStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

// "A new version is available" + Reload, shown when Firebase Remote Config says a newer
// version is live. It only ever reloads when the person presses Reload, so nobody loses
// what they were doing (a half-typed search, an unsaved profile change).
export default function UpdateBanner() {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(dismissedVersion);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const found = await checkForUpdate();
      if (!cancelled && found) setNewVersion(found);
    }

    void check(); // on load
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    // Coming back to the tab is a good moment: the person isn't in the middle of anything here yet
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, CHECK_EVERY_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!newVersion || newVersion === dismissed) return null;

  function later() {
    setDismissed(newVersion);
    try {
      sessionStorage.setItem(DISMISSED_KEY, newVersion as string);
    } catch {
      // storage blocked: it stays hidden until the page is reloaded
    }
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-surface py-2.5 pr-2.5 pl-4 shadow-pop sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <p className="min-w-0 flex-1 font-semibold">A new version is available</p>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={later}
          className="h-11 rounded-xl px-3 text-sm font-medium text-muted hover:bg-accent-soft hover:text-ink"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-rain px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          <RefreshIcon size={16} />
          Reload
        </button>
      </div>
    </div>
  );
}
