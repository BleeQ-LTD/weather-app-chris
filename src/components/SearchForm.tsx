"use client";

import { FormEvent, RefObject, useId, useState } from "react";

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (location: string) => void;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function SearchForm({
  value,
  onChange,
  onSearch,
  isLoading,
  inputRef,
}: SearchFormProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const [validationError, setValidationError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser reloading the page
    const trimmed = value.trim();

    if (!trimmed) {
      setValidationError("Enter a city or town name.");
      inputRef.current?.focus();
      return;
    }

    setValidationError("");
    onSearch(trimmed);
  }

  return (
    <form role="search" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="block font-medium">
        City or town
      </label>
      <p id={hintId} className="text-sm text-muted">
        For example, Lagos, Port Harcourt or Nairobi.
      </p>

      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          id={inputId}
          name="location"
          type="text"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (validationError) setValidationError("");
          }}
          aria-describedby={validationError ? `${hintId} ${errorId}` : hintId}
          aria-invalid={validationError ? true : undefined}
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted aria-invalid:border-alert"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="shrink-0 rounded-md bg-rain px-4 py-2.5 font-medium text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
      </div>

      {validationError && (
        <p id={errorId} className="mt-2 text-sm font-medium text-alert">
          {validationError}
        </p>
      )}
    </form>
  );
}