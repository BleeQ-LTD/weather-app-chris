"use client";

import { setTheme, useTheme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "@/components/icons";

// Light / Dark switch. "icon" is one button for the desktop nav;
// "segmented" shows both choices, for the footer on phones.
export default function ThemeToggle({
  variant = "icon",
  className = "",
}: {
  variant?: "icon" | "segmented";
  className?: string;
}) {
  const theme = useTheme();

  if (variant === "icon") {
    const next = theme === "dark" ? "light" : "dark";
    return (
      <button
        type="button"
        onClick={() => setTheme(next)}
        aria-label={`Switch to ${next} mode`}
        className={`h-11 w-11 items-center justify-center rounded-xl hover:bg-accent-soft ${className}`}
      >
        {theme === "dark" ? <SunIcon className="text-sun-ink" /> : <MoonIcon />}
      </button>
    );
  }

  return (
    <div
      role="group"
      aria-label="Appearance"
      className={`inline-flex rounded-full border border-line bg-surface p-1 ${className}`}
    >
      {(["light", "dark"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={theme === option}
          onClick={() => setTheme(option)}
          className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${
            theme === option ? "bg-rain text-white" : "text-muted hover:text-ink"
          }`}
        >
          {option === "light" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          {option === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
