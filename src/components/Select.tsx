"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

type Option = { value: string; label: string };

// A dropdown styled like the other form fields (the browser's own <select> looked
// out of place). Works with the keyboard: Enter/Space/arrows open it, arrows move,
// Enter/Space choose, Escape or Tab close.
export default function Select({
  label,
  value,
  onChange,
  options,
  placeholder = "Choose…",
  invalid = false,
  describedBy,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string; // id of the error message under the field
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const selected = options.find((option) => option.value === value);

  // Close when clicking anywhere outside
  useEffect(() => {
    if (!isOpen) return;
    function handleMouseDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isOpen]);

  function open() {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setIsOpen(true);
  }

  function choose(index: number) {
    onChange(options[index].value);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={rootRef}>
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <div className="relative mt-1">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={labelId}
          aria-controls={listId}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onClick={() => (isOpen ? setIsOpen(false) : open())}
          onKeyDown={handleKeyDown}
          className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-3 py-2 text-left focus:border-rain aria-invalid:border-alert"
        >
          <span className={selected ? "" : "text-muted"}>{selected ? selected.label : placeholder}</span>
          <span aria-hidden="true" className="text-muted">
            ▾
          </span>
        </button>

        {isOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-line bg-surface shadow-md"
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()} // keep focus on the button
                onClick={() => choose(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`cursor-pointer px-3 py-2 ${index === activeIndex ? "bg-line" : ""} ${
                  option.value === value ? "font-medium" : ""
                }`}
              >
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}