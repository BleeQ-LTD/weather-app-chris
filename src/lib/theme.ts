"use client";

import { useSyncExternalStore } from "react";
import { DARK_QUERY, THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/themeScript";

// Light or dark. With no saved choice we follow the device setting.
// The first choice is made before paint by THEME_SCRIPT (see layout.tsx).
export type Theme = "light" | "dark";

const listeners = new Set<() => void>();

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage blocked
  }
}

function deviceTheme(): Theme {
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // If the user hasn't picked a theme, follow the device when it switches (e.g. at sunset)
  const media = window.matchMedia?.(DARK_QUERY);
  const onDeviceChange = () => {
    if (!savedTheme()) apply(deviceTheme());
  };
  media?.addEventListener?.("change", onDeviceChange);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener?.("change", onDeviceChange);
  };
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // storage blocked: the choice lasts until the page is reloaded
  }
  apply(theme);
}

// Every component using this re-renders when the theme changes.
// The server doesn't know the theme, so it renders the light version.
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, () => "light");
}
