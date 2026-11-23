"use client";

import { setTemperatureUnit, useTemperatureUnit, type TempUnit } from "@/lib/units";

const UNITS: TempUnit[] = ["C", "F"];

// °C / °F switch on normal page backgrounds (the hero card has its own coloured one).
// Uses the same remembered setting, so changing it here changes it everywhere.
export default function UnitToggle() {
  const unit = useTemperatureUnit();
  return (
    <div role="group" aria-label="Temperature unit" className="inline-flex rounded-full border border-line bg-surface p-1">
      {UNITS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={unit === option}
          onClick={() => setTemperatureUnit(option)}
          className={`h-10 min-w-12 rounded-full px-3 text-[15px] font-semibold ${
            unit === option ? "bg-rain text-white" : "text-muted hover:text-ink"
          }`}
        >
          °{option}
        </button>
      ))}
    </div>
  );
}
