"use client";

import { useState } from "react";

type PasswordInputProps = {
  value: string;
  onChange: (value: string) => void;
  // "new-password" on sign-up, "current-password" on sign-in, so password managers behave correctly
  autoComplete: "new-password" | "current-password";
};

// A password field with a Show/Hide button so users can check what they typed
export default function PasswordInput({ value, onChange, autoComplete }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative mt-1">
      <input
        type={isVisible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-surface py-2 pl-3 pr-16 focus:border-rain"
      />
      <button
        type="button"
        onClick={() => setIsVisible((visible) => !visible)}
        aria-pressed={isVisible}
        aria-label={isVisible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 px-3 text-sm text-muted hover:text-ink"
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  );
}