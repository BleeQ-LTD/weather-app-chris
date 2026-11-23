"use client";

import {
  FormEvent,
  KeyboardEvent,
  RefObject,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Suggestion, formatPlace, kindLabel, matchesPlace } from "@/lib/weather";
import { AlertIcon, CloseIcon, PinIcon, SearchIcon } from "@/components/icons";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 300;

// Example places shown in the empty search box when we don't know where the
// user is: one after another, from different continents
const PLACEHOLDER_PLACES = [
  "Lagos, Nigeria",
  "London, United Kingdom",
  "New York, United States",
  "Nairobi, Kenya",
  "Tokyo, Japan",
  "São Paulo, Brazil",
];
const PLACEHOLDER_INTERVAL_MS = 2500;

// Where the user is, if they shared their location (from the location card).
// Used to show nearby examples and to rank nearby places first.
export interface NearbyHint {
  lat: number;
  lon: number;
  place?: Suggestion; // e.g. Eti Osa, Lagos, Nigeria
  examples?: string[]; // towns and areas near the user, e.g. "Ikeja, Lagos"
}

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (location: string) => void;
  onSelectSuggestion: (suggestion: Suggestion) => void;
  onClear: () => void; // the × button: empty the box and go back to the start
  near?: NearbyHint;
  isLoading: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
}

export default function SearchForm({
  value,
  onChange,
  onSearch,
  onSelectSuggestion,
  onClear,
  near,
  isLoading,
  inputRef,
}: SearchFormProps) {
  const labelId = useId();
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const listId = useId();

  const [validationError, setValidationError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [noMatchesFor, setNoMatchesFor] = useState("");
  const [isFetching, setIsFetching] = useState(false); // waiting for suggestions
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, Suggestion[]>());

  // Examples for the empty box: towns and areas near the user if we know where
  // they are; failing that, their own area and state; otherwise well-known places worldwide
  const nearbyExamples =
    near?.examples && near.examples.length > 0
      ? near.examples
      : near?.place
        ? [
            formatPlace(near.place),
            ...(near.place.region ? [`${near.place.region}, ${near.place.country}`] : []),
          ]
        : [];
  const examples = nearbyExamples.length > 0 ? nearbyExamples : PLACEHOLDER_PLACES;

  // Only rough coordinates are sent (2 decimal places, about 1 km), which is
  // enough to rank nearby places first
  const nearParams = "";

  // Rotate the example place in the empty box. Stops while the user has typed something.
  useEffect(() => {
    if (value) return;
    const timer = setInterval(
      () => setPlaceholderIndex((index) => index + 1),
      PLACEHOLDER_INTERVAL_MS
    );
    return () => clearInterval(timer);
  }, [value]);

  // Stop timers and requests if the component unmounts
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      pendingRequest.current?.abort();
    };
  }, []);

  function cancelPending() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    pendingRequest.current?.abort();
    setIsFetching(false);
  }

  function closeList() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function showResults(term: string, results: Suggestion[]) {
    // The search service sometimes returns places that have nothing to do with
    // what was typed (e.g. an airport in Turkey for "edo"). Only show places whose
    // name, region or country actually contains the typed words.
    const relevant = results.filter((place) => matchesPlace(term, place));
    setIsFetching(false);
    setSuggestions(relevant);
    setActiveIndex(-1);
    setIsOpen(relevant.length > 0);
    setNoMatchesFor(relevant.length === 0 ? term : "");
  }

  async function fetchSuggestions(term: string) {
    const key = `${term.toLowerCase()}${nearParams}`;
    const cached = cache.current.get(key);
    if (cached) {
      showResults(term, cached);
      return;
    }

    const controller = new AbortController();
    pendingRequest.current = controller;

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(term)}${nearParams}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Search failed: ${response.status}`);

      const results = (await response.json()) as Suggestion[];
      // The text may have changed or the list been dismissed while the body
      // was downloading; those results no longer belong on screen
      if (controller.signal.aborted) return;
      cache.current.set(key, results);
      showResults(term, results);
    } catch {
      if (controller.signal.aborted) return; // replaced by newer typing
      // Suggestions are a bonus: if they fail, hide them quietly.
      // The user can still press Search.
      setIsFetching(false);
      setSuggestions([]);
      closeList();
    }
  }

  // Runs on every keystroke, but only asks the server after typing pauses
  function handleInput(next: string) {
    onChange(next);
    if (validationError) setValidationError("");
    setNoMatchesFor("");
    cancelPending();
    // Old suggestions belong to the old text: clear them straight away so
    // Enter or a click can't pick one before the new results arrive
    setSuggestions([]);
    closeList();

    const term = next.trim();
    if (term.length < MIN_CHARS) return;

    // Show the spinner from the moment we start waiting, so slow connections
    // don't look like nothing is happening
    setIsFetching(true);
    debounceTimer.current = setTimeout(() => fetchSuggestions(term), DEBOUNCE_MS);
  }

  function selectSuggestion(suggestion: Suggestion) {
    cancelPending();
    onChange(formatPlace(suggestion));
    setSuggestions([]);
    closeList();
    onSelectSuggestion(suggestion);
  }

  // The × button: empty the box, hide suggestions and messages, and let the page
  // go back to where it started
  function clearSearch() {
    cancelPending();
    setSuggestions([]);
    closeList();
    setNoMatchesFor("");
    setValidationError("");
    onClear();
    inputRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = suggestions.length;

    switch (event.key) {
      case "ArrowDown":
        if (count === 0) return;
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((index) => (index + 1) % count);
        break;
      case "ArrowUp":
        if (count === 0) return;
        event.preventDefault();
        setIsOpen(true);
        setActiveIndex((index) => (index <= 0 ? count - 1 : index - 1));
        break;
      case "Enter":
        // Enter on a highlighted suggestion picks it; otherwise the form submits
        if (isOpen && activeIndex >= 0) {
          event.preventDefault();
          selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        if (isOpen) event.preventDefault();
        // Also cancel a request still in flight so it can't reopen the list
        cancelPending();
        closeList();
        break;
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser reloading the page
    cancelPending();
    closeList();

    const trimmed = value.trim();
    if (!trimmed) {
      setValidationError("Enter a city or town name.");
      inputRef.current?.focus();
      return;
    }

    setValidationError("");
    onSearch(trimmed);
  }

  const listVisible = isOpen && suggestions.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;
  const describedBy = [hintId, validationError ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <form role="search" onSubmit={handleSubmit} noValidate className="relative">
      <label id={labelId} htmlFor={inputId} className="sr-only">
        City or town
      </label>
      {/* One field holds the icon, the input and both buttons, with one focus ring around it all */}
      <div
        className={`search-field flex h-[52px] items-center gap-1 rounded-[14px] border bg-surface pr-1.5 pl-3.5 ${
          validationError ? "border-alert" : "border-control"
        }`}
      >
        <SearchIcon className="shrink-0 text-muted" />
        <div className="relative flex h-full min-w-0 flex-1 items-center">
          <input
            ref={inputRef}
            id={inputId}
            name="location"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={listVisible}
            aria-controls={listId}
            aria-activedescendant={
              listVisible && activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            aria-describedby={describedBy}
            aria-invalid={validationError ? true : undefined}
            value={value}
            placeholder={`Try "${examples[placeholderIndex % examples.length]}"`}
            onChange={(event) => handleInput(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              cancelPending();
              closeList();
            }}
            className="h-full w-full min-w-0 bg-transparent pr-2 pl-1.5 text-base text-ink placeholder:text-muted"
          />

          {isFetching && (
            <span
              aria-hidden="true"
              className="pointer-events-none mr-1 h-4 w-4 shrink-0 rounded-full border-2 border-line border-t-rain motion-safe:animate-spin"
            />
          )}
        </div>

        {value && (
          <button
            type="button"
            aria-label="Clear search"
            // mousedown fires before the input's blur, so the click still registers
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearSearch}
            className="flex h-10 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-accent-soft hover:text-ink"
          >
            <CloseIcon size={18} strokeWidth={2.2} />
          </button>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="h-10 shrink-0 rounded-[10px] bg-rain px-4 font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Searching…" : "Search"}
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-labelledby={labelId}
        hidden={!listVisible}
        className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
      >
        {suggestions.map((suggestion, index) => {
          const isActive = index === activeIndex;
          const rest = formatPlace(suggestion).slice(suggestion.name.length + 2);
          const tag = kindLabel(suggestion.kind);
          return (
            <li
              key={suggestion.id}
              id={optionId(index)}
              role="option"
              aria-selected={isActive}
              // mousedown fires before the input's blur, so the list
              // stays open long enough for the click to register
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectSuggestion(suggestion)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${
                isActive ? "bg-accent-soft" : ""
              }`}
            >
              <PinIcon size={18} className={`shrink-0 ${isActive ? "text-link" : "text-muted"}`} />
              <span>
                <span className="font-semibold">{suggestion.name}</span>
                {rest && <span className="text-muted">, {rest}</span>}
                {tag && <span className="ml-2 text-sm text-muted">· {tag}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Kept for screen readers; the rotating example in the box shows the same thing visually */}
      <p id={hintId} className="sr-only">
        Start typing, then pick a place from the list, for example Lagos, Nigeria.
      </p>

      {validationError && (
        <p id={errorId} className="mt-2 flex items-center gap-1.5 px-1 text-sm font-medium text-alert">
          <AlertIcon size={16} />
          {validationError}
        </p>
      )}
      {noMatchesFor && (
        <p className="mt-2 px-1 text-sm text-muted">
          No places match &ldquo;{noMatchesFor}&rdquo;. Check the spelling or try a
          nearby town.
        </p>
      )}

      {/* Tells screen-reader users suggestions appeared */}
      <p role="status" className="sr-only">
        {isFetching
          ? "Looking for places…"
          : listVisible
          ? `${suggestions.length} ${suggestions.length === 1 ? "suggestion" : "suggestions"}. Use up and down arrows to choose.`
          : ""}
      </p>
    </form>
  );
}