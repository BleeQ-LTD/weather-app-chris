"use client";

import { useSyncExternalStore } from "react";

// The user's temperature unit, remembered in this browser
export type TempUnit = "C" | "F";

const STORAGE_KEY = "weather-app:temp-unit";
const listeners = new Set<() => void>();

function readUnit(): TempUnit {
  try {
    return localStorage.getItem(STORAGE_KEY) === "F" ? "F" : "C";
  } catch {
    return "C"; // storage blocked
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setTemperatureUnit(unit: TempUnit) {
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch {
    // storage blocked: the choice lasts until the page is reloaded
  }
  listeners.forEach((listener) => listener());
}

// Every component using this re-renders when the unit changes.
// On the server (no localStorage) it's always Celsius.
export function useTemperatureUnit(): TempUnit {
  return useSyncExternalStore(subscribe, readUnit, () => "C");
}